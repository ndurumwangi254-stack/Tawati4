from functools import wraps

from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def role_required(*allowed_roles):
    """
    Restrict an endpoint to specific roles, e.g. @role_required("owner").
    Must be used together with a valid JWT (verify_jwt_in_request runs here).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify(error="Forbidden: insufficient role"), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def owner_required(fn):
    return role_required("owner")(fn)


def current_role():
    """Read the role out of the current JWT claims (call after verify_jwt_in_request)."""
    return get_jwt().get("role")
