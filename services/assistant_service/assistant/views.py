from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit_client import publish_audit_event
from .gemini_client import generate_assistant_response
from .models import Conversation, Message
from .permissions import IsParent
from .serializers import ConversationSerializer, MessageSerializer, SendMessageSerializer
from .service_clients import parent_owns_child


def _audit(request, event_type, conversation, *, metadata=None, summary=None):
    publish_audit_event(
        actor_id=request.user.id,
        actor_role='parent',
        event_type=event_type,
        outcome='success',
        child_id=conversation.child_id,
        parent_id=request.user.id,
        resource_type='assistant_conversation',
        resource_id=conversation.id,
        source_service='assistant_service',
        summary=summary or event_type.replace('_', ' '),
        metadata=metadata or {},
        visible_to_parent=True,
    )


class ConversationListView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsParent]

    def get_queryset(self):
        queryset = Conversation.objects.filter(parent_id=self.request.user.id, is_active=True)
        child_id = self.request.query_params.get('child_id')
        return queryset.filter(child_id=child_id) if child_id else queryset

    def perform_create(self, serializer):
        child_id = serializer.validated_data['child_id']
        if not parent_owns_child(self.request.user.id, child_id):
            raise PermissionDenied("Cet enfant n'appartient pas au compte connecte.")
        conversation = serializer.save(parent_id=self.request.user.id)
        _audit(self.request, 'assistant_conversation_created', conversation)


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsParent]
    lookup_field = 'id'

    def get_queryset(self):
        return Conversation.objects.filter(parent_id=self.request.user.id)

    def perform_destroy(self, instance):
        _audit(self.request, 'assistant_conversation_deleted', instance)
        instance.delete()


class ChatView(APIView):
    permission_classes = [IsParent]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        parent_id = request.user.id
        requested_child_id = data.get('child_id')
        conversation_id = data.get('conversation_id')

        if conversation_id:
            conversation = get_object_or_404(Conversation, id=conversation_id, parent_id=parent_id, is_active=True)
            if requested_child_id and str(requested_child_id) != str(conversation.child_id):
                raise ValidationError({'child_id': "Cette discussion est liee a un autre enfant."})
            child_id = conversation.child_id
        else:
            child_id = requested_child_id
            if not parent_owns_child(parent_id, child_id):
                raise PermissionDenied("Cet enfant n'appartient pas au compte connecte.")
            conversation = Conversation.objects.create(
                child_id=child_id,
                parent_id=parent_id,
                title='Nouvelle discussion',
            )
            _audit(request, 'assistant_conversation_created', conversation)

        if not parent_owns_child(parent_id, child_id):
            raise PermissionDenied("Acces a cet enfant refuse.")

        history = list(conversation.messages.order_by('-created_at')[:8])
        history.reverse()
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=data['message'],
        )

        _audit(request, 'assistant_context_accessed', conversation)
        result = generate_assistant_response(
            user_message=data['message'],
            conversation_history=history,
            child_id=child_id,
            parent_id=parent_id,
        )
        payload = result['payload']
        content = payload['answer']
        if payload.get('recommended_actions'):
            content = content + "\n\nActions conseillees :\n- " + "\n- ".join(payload['recommended_actions'])
        content = content + "\n\n" + payload['disclaimer']
        assistant_message = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=content,
            fallback_used=result['fallback_used'],
            safety_escalation=result['safety_escalation'],
            model_name=result['model_name'] or '',
        )

        if not conversation_id:
            snippet = data['message'][:30]
            conversation.title = f"Discussion : {snippet}{'...' if len(data['message']) > 30 else ''}"
        conversation.save()

        metadata = {
            'fallback_used': result['fallback_used'],
            'safety_escalation': result['safety_escalation'],
            'model_name': result['model_name'] or '',
        }
        event_type = 'assistant_emergency_escalation' if result['safety_escalation'] else 'assistant_response_generated'
        _audit(request, event_type, conversation, metadata=metadata)
        if result['fallback_used'] and not result['safety_escalation']:
            _audit(request, 'assistant_fallback_used', conversation, metadata=metadata)

        return Response({
            'conversation_id': conversation.id,
            'user_message': MessageSerializer(user_message).data,
            'assistant_message': MessageSerializer(assistant_message).data,
            'response': payload,
            'fallback_used': result['fallback_used'],
            'safety_escalation': result['safety_escalation'],
            'model_name': result['model_name'],
            'ai_enabled': result['ai_enabled'],
        }, status=status.HTTP_200_OK)
