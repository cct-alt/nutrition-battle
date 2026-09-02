@echo off
python -c "import sys; print('hello')" > output.txt 2>&1
type output.txt
pause