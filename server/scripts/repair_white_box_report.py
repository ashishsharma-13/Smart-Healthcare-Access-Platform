import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

import generate_white_box_report as source


def importance_score(test):
    title = test["title"].lower()
    keywords = {
        "unauthor": 8,
        "forbidden": 8,
        "ownership": 8,
        "security": 8,
        "invalid": 7,
        "reject": 7,
        "failure": 7,
        "error": 7,
        "duplicate": 7,
        "validation": 7,
        "success": 6,
        "create": 5,
        "update": 5,
        "delete": 5,
        "login": 8,
        "otp": 8,
        "emergency": 6,
    }
    return sum(weight for keyword, weight in keywords.items() if keyword in title)


def select_representative_tests(tests, limit=150):
    grouped = {}
    for test in tests:
        grouped.setdefault(test["suite"], []).append(test)

    selected = []
    remaining = []
    # Keep every suite represented, with a balanced six-case allocation first.
    for suite_tests in grouped.values():
        ranked = sorted(suite_tests, key=importance_score, reverse=True)
        selected.extend(ranked[:6])
        remaining.extend(ranked[6:])

    if len(selected) < limit:
        selected.extend(sorted(remaining, key=importance_score, reverse=True)[:limit - len(selected)])
    return selected[:limit]


def style_sheet(sheet, widths):
    header_fill = PatternFill("solid", fgColor="D9EAF7")
    for cell in sheet[1]:
        cell.font = Font(bold=True)
        cell.fill = header_fill
        cell.alignment = Alignment(vertical="top", wrap_text=True)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for index, width in enumerate(widths, 1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    for row in sheet.iter_rows():
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)


def main():
    source.OUTPUT = source.ROOT.parent / "SHAP_White_Box_Test_Report_150.xlsx"
    results = source.json.loads(source.RESULTS.read_text(encoding="utf-8"))
    all_tests = source.extract_tests(results)
    tests = select_representative_tests(all_tests)
    passed = sum(test["status"] == "PASSED" for test in all_tests)
    failed = sum(test["status"] == "FAILED" for test in all_tests)
    skipped = sum(test["status"] in {"PENDING", "TODO", "DISABLED"} for test in all_tests)
    run_date = source.datetime.now().strftime("%d %b %Y %H:%M")

    workbook = Workbook()
    summary = workbook.active
    summary.title = "Summary"
    summary.append(["SHAP White-Box Test Report", "", "", ""])
    summary.append(["Generated", run_date, "", ""])
    summary.append(["Execution tool", "Jest + Supertest", "", ""])
    summary.append(["Test scope", "Existing backend white-box and API integration suites", "", ""])
    summary.append(["", "", "", ""])
    summary.append(["Metric", "Value", "Notes", ""])
    summary.append(["Test suites", results.get("numTotalTestSuites", 0), "Executed Jest suites", ""])
    summary.append(["Executed test cases", len(all_tests), "Full Jest execution total", ""])
    summary.append(["Detailed cases shown", len(tests), "Curated representative cases; maximum 150", ""])
    summary.append(["Passed", passed, "Actual Jest result", ""])
    summary.append(["Failed", failed, "Actual Jest result", ""])
    summary.append(["Skipped / pending", skipped, "Actual Jest result", ""])
    summary.append(["Overall status", "PASS" if failed == 0 else "FAIL", "Based on executed assertions", ""])
    summary.append(["Report note", "The detailed sheet is intentionally capped at 150 representative cases. Full execution totals remain above.", "", ""])
    style_sheet(summary, [28, 28, 72, 12])
    summary["A1"].font = Font(bold=True, size=14)

    cases = workbook.create_sheet("Test Cases")
    cases.append(["Test ID", "SRS / Module", "Code Area", "Coverage Target", "Scenario / Branch",
                  "Input / System State", "Test Approach", "Expected Result", "Level",
                  "Suggested Tester", "Actual Result", "Status", "Run Date",
                  "Test Method / Evidence", "Defect ID"])
    for index, test in enumerate(tests, 1):
        status = test["status"].title()
        cases.append([
            f"WB-{index:03d}", test["module"], test["file"],
            "Implemented branch and assertion coverage", test["title"],
            "Fixture and request state defined in the test", "Jest + Supertest",
            "Expected API or service behavior is asserted by the test.",
            "Integration / unit", "SHAP QA",
            "Assertion passed in Jest." if test["status"] == "PASSED" else f"Jest result: {status}",
            status, run_date, f"{test['file']} ({test['duration']} ms)", "",
        ])
    style_sheet(cases, [12, 22, 35, 30, 58, 34, 20, 45, 18, 18, 26, 12, 20, 42, 12])

    inventory = workbook.create_sheet("Suite Inventory")
    inventory.append(["Suite", "Module / Area", "Test Cases", "Passed", "Failed", "Skipped", "Status", "Source File"])
    grouped = {}
    for test in tests:
        grouped.setdefault(test["suite"], []).append(test)
    for suite, suite_tests in sorted(grouped.items()):
        suite_failed = sum(t["status"] == "FAILED" for t in suite_tests)
        inventory.append([
            suite, suite_tests[0]["module"], len(suite_tests),
            sum(t["status"] == "PASSED" for t in suite_tests), suite_failed,
            sum(t["status"] in {"PENDING", "TODO", "DISABLED"} for t in suite_tests),
            "PASS" if suite_failed == 0 else "FAIL", suite_tests[0]["file"],
        ])
    style_sheet(inventory, [38, 26, 14, 12, 12, 12, 12, 42])

    notes = workbook.create_sheet("Execution Notes")
    notes.append(["Execution Notes", ""])
    notes.append(["Source", "Jest JSON output generated from the existing server test suite."])
    notes.append(["Framework", "Jest 29 + Supertest 7"])
    notes.append(["Environment", "Node.js backend with MongoMemoryServer-backed integration tests where configured."])
    notes.append(["Interpretation", "Each detailed row corresponds to an implemented Jest assertion/test case."])
    notes.append(["Status", "PASS/FAIL values are copied from Jest execution results."])
    notes.append(["Limitations", "This is a test execution report, not a new test implementation or a claim of untested frontend behavior."])
    style_sheet(notes, [24, 110])

    workbook.save(source.OUTPUT)
    print(f"Rebuilt valid workbook: {source.OUTPUT}")


if __name__ == "__main__":
    sys.exit(main())
