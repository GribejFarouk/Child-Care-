import os
import glob
from pathlib import Path

# Paths to python files
services_dir = Path("services")
py_files = list(services_dir.rglob("*.py"))

for py_file in py_files:
    if "site-packages" in str(py_file) or ".venv" in str(py_file):
        continue
        
    try:
        content = py_file.read_text(encoding="utf-8")
        if "INTERNAL_SERVICE_TOKEN" in content:
            # Replace the generic fallback
            new_content = content.replace(
                "os.environ.get('INTERNAL_SERVICE_TOKEN', 'change_me_internal_token_123')",
                "os.environ.get('INTERNAL_SERVICE_TOKEN')"
            )
            
            # Need to add ImproperlyConfigured check somewhere, but doing it automatically in every file is risky.
            # Instead, we just replace the fallback, which means `INTERNAL_SERVICE_TOKEN` might be None.
            # If it's None, the existing logic `if not auth_header or auth_header != INTERNAL_SERVICE_TOKEN:` will fail the request, which is EXACTLY what we want (deny access).
            # We don't necessarily have to crash the server at startup; failing the request with 403 because token is None vs expected is fine!
            # Wait, the prompt says "Startup Enforcement: Reject default/missing tokens in production mode. Raise ImproperlyConfigured or log a critical error if INTERNAL_SERVICE_TOKEN is missing or set to a default."
            # The easiest way to do Startup Enforcement is in `apps.py` or `settings.py` of each service!
            
            if new_content != content:
                py_file.write_text(new_content, encoding="utf-8")
                print(f"Updated {py_file}")
    except Exception as e:
        print(f"Error reading {py_file}: {e}")

# Now let's enforce startup checks in settings.py of all services
settings_files = list(services_dir.rglob("settings.py"))
for sf in settings_files:
    if "site-packages" in str(sf): continue
    content = sf.read_text(encoding="utf-8")
    enforcement_code = """
import os
from django.core.exceptions import ImproperlyConfigured
INTERNAL_TOKEN = os.environ.get('INTERNAL_SERVICE_TOKEN')
if not INTERNAL_TOKEN or INTERNAL_TOKEN == 'change_me_internal_token_123':
    raise ImproperlyConfigured("INTERNAL_SERVICE_TOKEN is missing or insecurely configured.")
"""
    if "ImproperlyConfigured" not in content and "INTERNAL_SERVICE_TOKEN" not in content:
        content += "\n" + enforcement_code
        sf.write_text(content, encoding="utf-8")
        print(f"Added enforcement to {sf}")

