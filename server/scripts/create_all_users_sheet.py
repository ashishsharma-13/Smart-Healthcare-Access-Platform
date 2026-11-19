import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "server" / "all-users-export.json"
OUTPUT = ROOT / "SHAP_All_Registered_Users_Google_Sheets.xlsx"

rows = json.loads(SOURCE.read_text(encoding="utf-8"))

book = Workbook()
sheet = book.active
sheet.title = "Registered Users"
headers = [
    "Database ID", "Role", "Name", "Login ID / Email", "Phone",
    "Status", "Active", "Password / Password Status", "Created At",
]
sheet.append(headers)
for user in rows:
    sheet.append([
        user["databaseId"],
        user["role"],
        user["name"],
        user["email"],
        user["phone"],
        user["status"],
        user["isActive"],
        user["password"],
        user["createdAt"],
    ])

header_fill = PatternFill("solid", fgColor="D9EAF7")
for cell in sheet[1]:
    cell.font = Font(bold=True, color="111827")
    cell.fill = header_fill
for row in sheet.iter_rows():
    for cell in row:
        cell.alignment = Alignment(vertical="top", wrap_text=True)
for index, width in enumerate([28, 16, 30, 40, 22, 22, 12, 46, 26], 1):
    sheet.column_dimensions[get_column_letter(index)].width = width
sheet.freeze_panes = "A2"
sheet.auto_filter.ref = sheet.dimensions

notes = book.create_sheet("Notes")
notes.append(["Item", "Details"])
notes.append(["Scope", f"All {len(rows)} users returned from the configured SHAP database after the standard demo seed and demo-account seed."])
notes.append(["Google Sheets", "Upload this .xlsx file to Google Drive and choose Open with Google Sheets."])
notes.append(["Passwords", "MongoDB stores password hashes, not plaintext passwords. Only known seed passwords are shown; all other users require a password reset."])
notes.append(["Security", "Treat this workbook as sensitive and remove it from shared locations after testing."])
for cell in notes[1]:
    cell.font = Font(bold=True, color="111827")
    cell.fill = header_fill
for row in notes.iter_rows():
    for cell in row:
        cell.alignment = Alignment(vertical="top", wrap_text=True)
notes.column_dimensions["A"].width = 24
notes.column_dimensions["B"].width = 120

book.save(OUTPUT)
print(f"Created {OUTPUT} with {len(rows)} users")
