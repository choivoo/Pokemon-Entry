#!/bin/bash
# Full regeneration + verification. Output summary in build/test_results.txt
set -eo pipefail
cd "$(dirname "$0")/.."
R=build/test_results.txt; : > $R
python3 tools/build_world.py | tee -a $R
echo "--- engine invariants (node tests/test.js)" | tee -a $R; node tests/test.js | tee -a $R
echo "--- trace dump" | tee -a $R
node tools/dump_trace.js fast 7 build/trace_fast7.json | tee -a $R
node tools/dump_trace.js normal 9 build/trace_normal9.json shuffle | tee -a $R
echo "--- blocks replay vs engine" | tee -a $R
python3 tests/test_blocks.py build/trace_fast7.json build/trace_normal9.json | tee -a $R
echo "--- packaged .ent (serialized JSON) replay" | tee -a $R; python3 tools/assemble.py >/dev/null; python3 tests/test_blocks.py --ent build/Pokemon_Pikachu_Kanto_Journey_1.0.ent build/trace_fast7.json build/trace_normal9.json | tee -a $R
echo "--- blocks unit tests" | tee -a $R; python3 tests/test_blocks2.py | tee -a $R
echo "--- multi seed full playthroughs" | tee -a $R; node tools/multi_seed.js | tee -a $R
echo "--- chapter report" | tee -a $R; node tools/chapter_report.js | tee -a $R
echo "--- assemble" | tee -a $R; python3 tools/make_assets.py | tee -a $R; python3 tools/assemble.py | tee -a $R
python3 tools/make_docs.py | tee -a $R; python3 tools/make_qa.py | tee -a $R
echo ALL-DONE | tee -a $R
