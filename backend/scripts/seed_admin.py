import argparse
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import SessionLocal
from app.models import SuperAdmin
from app.security import get_password_hash


def seed_super_admin(email: str, password: str) -> int:
    db = SessionLocal()
    try:
        existing = db.query(SuperAdmin).filter(SuperAdmin.email == email).first()
        if existing:
            print(f"Super admin already exists: {email}")
            return 0

        admin = SuperAdmin(email=email, password_hash=get_password_hash(password))
        db.add(admin)
        db.commit()
        print(f"Created super admin: {email}")
        return 0
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed a super admin user.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sys.exit(seed_super_admin(args.email, args.password))


if __name__ == "__main__":
    main()
