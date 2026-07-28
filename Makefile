# Computational Software Engineering Makefile
.PHONY: all setup clean build test install format lint docs benchmark profile

# Directories
BUILD_DIR := build
INSTALL_DIR := install
SRC_DIR := src
TEST_DIR := tests

# Default target
all: setup build

# Environment setup
setup:
	@echo "=== Setting up environment ==="
	python -m pip install --upgrade pip
	pip install -r requirements.txt
	@echo "Environment ready!"

# Python virtual environment
venv:
	python -m venv .venv
	@echo "Virtual environment created. Run: source .venv/bin/activate (or .venv\\Scripts\\activate on Windows)"

# C++ build
build:
	@mkdir -p $(BUILD_DIR)
	cd $(BUILD_DIR) && cmake .. -DCMAKE_BUILD_TYPE=Release
	cd $(BUILD_DIR) && cmake --build -j$(shell nproc 2>/dev/null || echo 4)

debug:
	@mkdir -p $(BUILD_DIR)
	cd $(BUILD_DIR) && cmake .. -DCMAKE_BUILD_TYPE=Debug
	cd $(BUILD_DIR) && cmake --build -j$(shell nproc 2>/dev/null || echo 4)

# Testing
test:
	cd $(BUILD_DIR) && ctest --output-on-failure
	pytest tests/ -v

test-cpp:
	cd $(BUILD_DIR) && ctest --output-on-failure -V

test-py:
	pytest tests/ -v --cov=src --cov-report=html

# Code quality
format:
	black src/ tests/ scripts/
	isort src/ tests/ scripts/
	find src -name "*.cpp" -o -name "*.hpp" | xargs clang-format -i 2>/dev/null || true

lint:
	flake8 src/ tests/
	mypy src/

# Documentation
docs:
	cd docs && make html

# Benchmarking
benchmark:
	pytest tests/benchmarks/ -v --benchmark-only

# Profiling
profile:
	python -m cProfile -o profile.stats main.py
	python -c "import pstats; p = pstats.Stats('profile.stats'); p.sort_stats('cumulative').print_stats(20)"

# Clean
clean:
	rm -rf $(BUILD_DIR)
	rm -rf __pycache__ .pytest_cache .mypy_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

distclean: clean
	rm -rf .venv install dist *.egg-info

# Install locally
install:
	pip install -e .

# Jupyter
jupyter:
	jupyter lab --ip=0.0.0.0 --port=8888 --no-browser

# Docker
docker-build:
	docker build -t compute-engine:latest .

docker-run:
	docker run -it --rm -v $(PWD):/workspace compute-engine:latest

# Help
help:
	@echo "Available targets:"
	@echo "  setup      - Install Python dependencies"
	@echo "  venv       - Create Python virtual environment"
	@echo "  build      - Build C++ code (Release)"
	@echo "  debug      - Build C++ code (Debug)"
	@echo "  test       - Run all tests (C++ and Python)"
	@echo "  format     - Format code (Python and C++)"
	@echo "  lint       - Run linters"
	@echo "  docs       - Build documentation"
	@echo "  benchmark  - Run performance benchmarks"
	@echo "  profile    - Profile Python code"
	@echo "  clean      - Clean build artifacts"
	@echo "  jupyter    - Start Jupyter Lab"
	@echo "  help       - Show this help"
