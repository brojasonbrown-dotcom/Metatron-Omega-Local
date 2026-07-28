#!/bin/bash
# Computational Software Engineering Environment Setup
# Run from Git Bash or WSL

set -e

echo "=== Setting up Computational Engineering Environment ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install winget packages if on Windows
if command_exists winget; then
    echo -e "${YELLOW}Installing system tools via winget...${NC}"
    
    # C/C++ toolchain
    winget install -e --id GNU.MINGW --accept-package-agreements --accept-source-agreements || true
    winget install -e --id Kitware.CMake --accept-package-agreements --accept-source-agreements || true
    winget install -e --id Ninja-build.Ninja --accept-package-agreements --accept-source-agreements || true
    
    # Rust
    winget install -e --id Rustlang.Rustup --accept-package-agreements --accept-source-agreements || true
    
    # Go
    winget install -e --id GoLang.Go --accept-package-agreements --accept-source-agreements || true
    
    # Git tools
    winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements || true
    
    # Docker Desktop
    winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements || true
    
    # VS Code (in case not installed)
    winget install -e --id Microsoft.VisualStudioCode --accept-package-agreements --accept-source-agreements || true
    
    echo -e "${GREEN}System tools installed!${NC}"
fi

# Python scientific stack
echo -e "${YELLOW}Installing Python computational packages...${NC}"
pip install --upgrade pip

# Core scientific
pip install numpy scipy pandas matplotlib seaborn plotly

# Numerical computing & linear algebra
pip install numba sympy theano

# Machine learning
pip install scikit-learn xgboost lightgbm

# Deep learning (CPU only for dev container)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install tensorflow-cpu

# Data handling
pip install h5py netCDF4 xarray pyarrow

# Optimization & simulation
pip install cvxpy scipy-optimize

# Jupyter & dev tools
pip install jupyter jupyterlab ipython black isort flake8 mypy pytest pytest-benchmark

# Profiling & debugging
pip install line_profiler memory_profiler py-spy

# Build tools
pip install meson-python scikit-build cython pybind11

# Documentation
pip install sphinx mkdocs

echo -e "${GREEN}Python packages installed!${NC}"

# Rust setup
if command_exists rustup; then
    echo -e "${YELLOW}Setting up Rust...${NC}"
    rustup update
    rustup component add rustfmt clippy
    rustup target add wasm32-unknown-unknown
    cargo install cargo-binstall cargo-watch cargo-expand cargo-audit
    echo -e "${GREEN}Rust ready!${NC}"
fi

# Verify installations
echo ""
echo "=== Verification ==="
echo "Python: $(python --version)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
command_exists gcc && echo "GCC: $(gcc --version | head -1)" || echo "GCC: Not found (may need restart)"
command_exists cmake && echo "CMake: $(cmake --version | head -1)" || echo "CMake: Not found (may need restart)"
command_exists ninja && echo "Ninja: $(ninja --version)" || echo "Ninja: Not found (may need restart)"
command_exists rustc && echo "Rust: $(rustc --version)" || echo "Rust: Not found (may need restart)"
command_exists go && echo "Go: $(go version)" || echo "Go: Not found (may need restart)"

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo "NOTE: You may need to restart your terminal for PATH changes to take effect."
