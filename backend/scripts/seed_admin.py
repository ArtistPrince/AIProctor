import argparse
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import SessionLocal
from app.models import User
from app.security import get_password_hash


def seed_admin(email: str, password: str, role: str) -> int:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print("User already exists:", email)
            return 1

        normalized_role = role.lower()
        user = User(
            email=email,
            password_hash=get_password_hash(password),
            role=normalized_role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Created user:", user.email, "role:", user.role)
        return 0
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed an initial admin user.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument(
        "--role",
        default="super_admin",
        choices=["super_admin", "institute_admin", "exam_admin", "proctor", "student"],
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    exit_code = seed_admin(args.email, args.password, args.role)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
