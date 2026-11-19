from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "SHAP_Demo_Accounts_Private_Hospitals.xlsx"
PASSWORD = "ShapDemo@2026"

accounts = [
    ["Patient", "Aarav Mehta", "aarav.mehta.demo@shap.health", PASSWORD, "New Delhi", "Demo account"],
    ["Patient", "Ananya Iyer", "ananya.iyer.demo@shap.health", PASSWORD, "Mumbai", "Demo account"],
    ["Patient", "Rohan Sen", "rohan.sen.demo@shap.health", PASSWORD, "Kolkata", "Demo account"],
    ["Patient", "Meera Nair", "meera.nair.demo@shap.health", PASSWORD, "Bengaluru", "Demo account"],
    ["Patient", "Vikram Rao", "vikram.rao.demo@shap.health", PASSWORD, "Chennai", "Demo account"],
    ["Doctor", "Dr. Kavya Sharma", "kavya.sharma.demo@shap.health", PASSWORD, "New Delhi", "Cardiology"],
    ["Doctor", "Dr. Arjun Kapoor", "arjun.kapoor.demo@shap.health", PASSWORD, "Mumbai", "Emergency Medicine"],
    ["Doctor", "Dr. Sayan Mukherjee", "sayan.mukherjee.demo@shap.health", PASSWORD, "Kolkata", "General Medicine"],
    ["Doctor", "Dr. Nandini Rao", "nandini.rao.demo@shap.health", PASSWORD, "Bengaluru", "Neurology"],
    ["Doctor", "Dr. Harish Iyer", "harish.iyer.demo@shap.health", PASSWORD, "Chennai", "Trauma Surgery"],
    ["Hospital", "Manipal Hospital Bengaluru Demo", "manipal.bengaluru.demo@shap.health", PASSWORD, "Bengaluru", "Private"],
    ["Hospital", "Apollo Hospitals Chennai Demo", "apollo.chennai.demo@shap.health", PASSWORD, "Chennai", "Private"],
    ["Admin", "Ashish Sharma", "ashish.sharma.admin@shap.health", PASSWORD, "Platform", "Administrator"],
    ["Admin", "Ajit Tiwari", "ajit.tiwari.admin@shap.health", PASSWORD, "Platform", "Administrator"],
]

hospitals = [
    ["Manipal Hospital Bengaluru Demo", "Bengaluru", "Karnataka", "Private", "Emergency, ICU, Trauma Care", "Fallback directory also contains Bengaluru government facilities"],
    ["Apollo Hospitals Chennai Demo", "Chennai", "Tamil Nadu", "Private", "Emergency, ICU, Trauma Care", "Fallback directory also contains Chennai government facilities"],
]


def style_sheet(sheet, widths):
    header_fill = PatternFill("solid", fgColor="D9EAF7")
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="111827")
        cell.fill = header_fill
    for row in sheet.iter_rows():
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
    for index, width in enumerate(widths, 1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions


book = Workbook()
sheet = book.active
sheet.title = "Login Accounts"
sheet.append(["Role", "Name", "Login ID / Email", "Password", "City / Scope", "Specialization / Type"])
for row in accounts:
    sheet.append(row)
style_sheet(sheet, [14, 32, 38, 20, 18, 34])

directory = book.create_sheet("Hospital Directory")
directory.append(["Hospital", "City", "State", "Ownership", "Capabilities", "Fallback Coverage Note"])
for row in hospitals:
    directory.append(row)
style_sheet(directory, [38, 18, 20, 16, 34, 76])

notes = book.create_sheet("Usage Notes")
notes.append(["Item", "Details"])
notes.append(["Generated", datetime.now().strftime("%d %b %Y %H:%M")])
notes.append(["Purpose", "Demo credentials for SHAP local/demo testing only."])
notes.append(["Google Sheets", "Upload this .xlsx file to Google Drive and choose Open with Google Sheets."])
notes.append(["Password policy", f"All listed demo accounts use the shared demo password: {PASSWORD}"])
notes.append(["Emergency fallback", "The existing multi-city external healthcare directory remains separate from SHAP partner hospitals and includes government facilities across Hyderabad, Delhi, Mumbai, Kolkata, Bengaluru, and Chennai."])
notes.append(["Security", "Change or revoke these credentials before any production deployment."])
style_sheet(notes, [24, 110])

book.save(OUTPUT)
print(f"Created {OUTPUT}")
