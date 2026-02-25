import cv2
import face_recognition
import numpy as np
from PIL import Image

# -----------------------------------
# STEP 1: Load and encode profile image
# -----------------------------------

# Load image using PIL (most reliable)
img = Image.open("profile.jpg").convert("RGB")
profile_image = np.array(img, dtype=np.uint8)

# Detect face with upsampling for better accuracy
profile_face_locations = face_recognition.face_locations(
    profile_image,
    number_of_times_to_upsample=2
)

if len(profile_face_locations) == 0:
    print("No face detected in profile image")
    exit()

profile_encoding = face_recognition.face_encodings(
    profile_image,
    profile_face_locations
)[0]

# -----------------------------------
# STEP 2: Start webcam
# -----------------------------------

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert frame to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Detect faces
    face_locations = face_recognition.face_locations(rgb_frame)
    face_encodings = face_recognition.face_encodings(
        rgb_frame, face_locations
    )

    for (top, right, bottom, left), face_encoding in zip(
        face_locations, face_encodings
    ):
        # Calculate face distance
        distance = face_recognition.face_distance(
            [profile_encoding],
            face_encoding
        )[0]

        # Convert distance to confidence percentage
        confidence = round((1 - distance) * 100, 2)

        # Decide match (tolerance = 0.6)
        if distance <= 0.6:
            text = f"MATCH ({confidence}%)"
            color = (0, 255, 0)
        else:
            text = f"NOT MATCH ({confidence}%)"
            color = (0, 0, 255)

        # Draw face rectangle
        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

        # Display text
        cv2.putText(
            frame,
            text,
            (left, top - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            color,
            2
        )

    cv2.imshow("Face Recognition", frame)

    # Press Q to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
