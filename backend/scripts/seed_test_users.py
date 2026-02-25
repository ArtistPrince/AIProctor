import argparse
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import SessionLocal
from app.models import Institute, User, Batch
from app.security import get_password_hash


def seed_users(institute_name: str, password: str) -> int:
    db = SessionLocal()
    try:
        institute = db.query(Institute).filter(Institute.name == institute_name).first()
        if not institute:
            institute = Institute(name=institute_name, plan="Free", config={})
            db.add(institute)
            db.commit()
            db.refresh(institute)

        profile_path = os.path.abspath(
            os.path.join(BACKEND_DIR, "..", "Face_Recognition_Project_Pheme", "profile.jpg")
        )
        users = [
            ("super_admin", "super_admin@pheme.test", None),
            ("institute_admin", "institute_admin@pheme.test", institute.id),
            ("exam_admin", "exam_admin@pheme.test", institute.id),
            ("proctor", "proctor@pheme.test", institute.id),
            ("student", "student@pheme.test", institute.id),
        ]

        created = 0
        created_users = []
        for role, email, institute_id in users:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                if existing.profile_image != profile_path:
                    existing.profile_image = profile_path
                created_users.append(existing)
                continue

            user = User(
                institute_id=institute_id,
                email=email,
                password_hash=get_password_hash(password),
                role=role,
                profile_image=profile_path,
            )
            db.add(user)
            created += 1
            created_users.append(user)

        db.commit()

        student_user = next((user for user in created_users if user.role == "student"), None)
        if student_user:
            batch_name = "Pheme-Test-Batch"
            batch = db.query(Batch).filter(Batch.name == batch_name, Batch.institute_id == institute.id).first()
            if not batch:
                batch = Batch(name=batch_name, institute_id=institute.id, members=[student_user.id])
                db.add(batch)
            else:
                members = set(batch.members or [])
                members.add(student_user.id)
                batch.members = sorted(members)
            db.commit()

        print(f"Created {created} test users for {institute_name}.")
        return 0
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed test users for all roles.")
    parser.add_argument("--institute", default="Pheme")
    parser.add_argument("--password", default="Testing123!")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    exit_code = seed_users(args.institute, args.password)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
