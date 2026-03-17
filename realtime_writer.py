"""
1-minute realtime writer for dashboard-compatible JSON.

Reads source CSV and continuously writes:
dashboard/public/realtime/data_latest.json
"""

import argparse
import time
from datetime import datetime

from generate_dashboard_data import generate


DEFAULT_INPUT = "mae_results.csv"
DEFAULT_OUTPUT = "dashboard/public/realtime/data_latest.json"


def main():
    parser = argparse.ArgumentParser(description="Continuously generate realtime dashboard JSON")
    parser.add_argument("--csv", default=DEFAULT_INPUT, help="Input CSV path")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Realtime output JSON path")
    parser.add_argument("--interval", type=int, default=60, help="Write interval in seconds")
    args = parser.parse_args()

    print("🚀 Starting realtime writer")
    print(f"   source: {args.csv}")
    print(f"   output: {args.output}")
    print(f"   interval: {args.interval}s")

    while True:
        started = datetime.utcnow().isoformat() + "Z"
        try:
            generate(csv_path=args.csv, output_path=args.output)
            print(f"✅ refresh complete at {started}")
        except Exception as error:
            print(f"❌ refresh failed at {started}: {error}")

        time.sleep(max(args.interval, 1))


if __name__ == "__main__":
    main()

