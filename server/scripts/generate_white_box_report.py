import json
import re
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "white-box-test-results.json"
OUTPUT = ROOT.parent / "SHAP_White_Box_Test_Report.xlsx"


def xml_safe(value):
    text = "" if value is None else str(value)
    return "".join(
        character for character in text
        if character in "\t\n\r" or ord(character) >= 0x20
    )


def col_name(number):
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def cell(value, row, column, style=0):
    ref = f"{col_name(column)}{row}"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
    text = escape(xml_safe(value))
    return f'<c r="{ref}" t="inlineStr" s="{style}"><is><t xml:space="preserve">{text}</t></is></c>'


def sheet_xml(rows, widths=None):
    xml_rows = []
    for row_number, values in enumerate(rows, 1):
        xml_rows.append(
            f'<row r="{row_number}">' +
            "".join(cell(value, row_number, index + 1, 1 if row_number == 1 else 0)
                    for index, value in enumerate(values)) +
            "</row>"
        )
    cols = ""
    if widths:
        cols = "<cols>" + "".join(
            f'<col min="{index + 1}" max="{index + 1}" width="{width}" customWidth="1"/>'
            for index, width in enumerate(widths)
        ) + "</cols>"
    max_col = col_name(max(len(row) for row in rows))
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<dimension ref="A1:{max_col}{len(rows)}"/>{cols}'
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
        '<sheetFormatPr defaultRowHeight="18"/>'
        f'<sheetData>{"".join(xml_rows)}</sheetData>'
        '</worksheet>'
    )


def extract_tests(results):
    rows = []
    for suite in results.get("testResults", []):
        path = Path(suite.get("name", ""))
        suite_name = path.stem
        module = re.sub(r"Module\d+", "", suite_name)
        module = re.sub(r"(?<!^)(?=[A-Z])", " ", module).replace("_", " ").strip()
        for assertion in suite.get("assertionResults", []):
            ancestors = assertion.get("ancestorTitles", [])
            title = " > ".join([*ancestors, assertion.get("title", "")])
            status = assertion.get("status", "unknown").upper()
            rows.append({
                "suite": suite_name,
                "module": module or suite_name,
                "title": title,
                "status": status,
                "duration": assertion.get("duration") or 0,
                "file": str(path.relative_to(ROOT)).replace("\\", "/") if path.is_absolute() else str(path),
            })
    return rows


def main():
    if not RESULTS.exists():
        print(f"Missing Jest results: {RESULTS}", file=sys.stderr)
        return 1

    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    tests = extract_tests(results)
    passed = sum(test["status"] == "PASSED" for test in tests)
    failed = sum(test["status"] == "FAILED" for test in tests)
    skipped = sum(test["status"] in {"PENDING", "TODO", "DISABLED"} for test in tests)
    run_date = datetime.now().strftime("%d %b %Y %H:%M")

    summary = [
        ["SHAP White-Box Test Report", "", "", "", ""],
        ["Generated", run_date, "", "", ""],
        ["Execution tool", "Jest + Supertest", "", "", ""],
        ["Test scope", "Existing backend white-box and API integration suites", "", "", ""],
        ["", "", "", "", ""],
        ["Metric", "Value", "Notes", "", ""],
        ["Test suites", results.get("numTotalTestSuites", 0), "Executed Jest suites", "", ""],
        ["Total test cases", results.get("numTotalTests", len(tests)), "Implemented assertions discovered in Jest output", "", ""],
        ["Passed", passed, "Actual Jest result", "", ""],
        ["Failed", failed, "Actual Jest result", "", ""],
        ["Skipped / pending", skipped, "Actual Jest result", "", ""],
        ["Overall status", "PASS" if failed == 0 else "FAIL", "Based on executed assertions", "", ""],
        ["", "", "", "", ""],
        ["Report note", "This workbook documents the already implemented Jest/Supertest cases; it does not add or modify tests.", "", "", ""],
    ]

    case_rows = [[
        "Test ID", "SRS / Module", "Code Area", "Coverage Target", "Scenario / Branch",
        "Input / System State", "Test Approach", "Expected Result", "Level",
        "Suggested Tester", "Actual Result", "Status", "Run Date", "Test Method / Evidence", "Defect ID"
    ]]
    for index, test in enumerate(tests, 1):
        status = test["status"].title()
        actual = "Assertion passed in Jest." if test["status"] == "PASSED" else f"Jest result: {status}"
        case_rows.append([
            f"WB-{index:03d}",
            test["module"],
            test["file"],
            "Implemented branch and assertion coverage",
            test["title"],
            "Fixture and request state defined in the test",
            "Jest + Supertest",
            "Expected API or service behavior is asserted by the test.",
            "Integration / unit",
            "SHAP QA",
            actual,
            status,
            run_date,
            f"{test['file']} ({test['duration']} ms)",
            "",
        ])

    suite_rows = [["Suite", "Module / Area", "Test Cases", "Passed", "Failed", "Skipped", "Status", "Source File"]]
    grouped = {}
    for test in tests:
        grouped.setdefault(test["suite"], []).append(test)
    for suite, suite_tests in sorted(grouped.items()):
        suite_passed = sum(t["status"] == "PASSED" for t in suite_tests)
        suite_failed = sum(t["status"] == "FAILED" for t in suite_tests)
        suite_skipped = sum(t["status"] in {"PENDING", "TODO", "DISABLED"} for t in suite_tests)
        suite_rows.append([
            suite,
            suite_tests[0]["module"],
            len(suite_tests),
            suite_passed,
            suite_failed,
            suite_skipped,
            "PASS" if suite_failed == 0 else "FAIL",
            suite_tests[0]["file"],
        ])

    notes = [
        ["Execution Notes", ""],
        ["Source", "Jest JSON output generated from the existing server test suite."],
        ["Framework", "Jest 29 + Supertest 7"],
        ["Environment", "Node.js backend with MongoMemoryServer-backed integration tests where configured."],
        ["Interpretation", "Each detailed row corresponds to an implemented Jest assertion/test case."],
        ["Status", "PASS/FAIL values are copied from Jest execution results."],
        ["Limitations", "This is a test execution report, not a new test implementation or a claim of untested frontend behavior."],
    ]

    workbook = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Summary" sheetId="1" r:id="rId1"/>
<sheet name="Test Cases" sheetId="2" r:id="rId2"/>
<sheet name="Suite Inventory" sheetId="3" r:id="rId3"/>
<sheet name="Execution Notes" sheetId="4" r:id="rId4"/>
</sheets></workbook>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/>
</Relationships>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>'''
    root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="D9EAF7"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0"/></cellXfs>
</styleSheet>'''

    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", root_rels)
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", rels)
        archive.writestr("xl/styles.xml", styles)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml(summary, [28, 24, 70, 10, 10]))
        archive.writestr("xl/worksheets/sheet2.xml", sheet_xml(case_rows, [12, 22, 35, 30, 58, 34, 20, 45, 18, 18, 26, 12, 20, 42, 12]))
        archive.writestr("xl/worksheets/sheet3.xml", sheet_xml(suite_rows, [38, 26, 14, 12, 12, 12, 12, 42]))
        archive.writestr("xl/worksheets/sheet4.xml", sheet_xml(notes, [24, 110]))

    print(f"Created {OUTPUT}")
    print(f"Suites: {results.get('numTotalTestSuites', 0)}, tests: {len(tests)}, passed: {passed}, failed: {failed}, skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
