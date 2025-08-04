
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libopencv-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Crow header-only framework
RUN git clone https://github.com/CrowCpp/Crow.git /tmp/crow && \
    mkdir -p /usr/local/include/crow && \
    cp -r /tmp/crow/include/crow /usr/local/include/ && \
    rm -rf /tmp/crow

WORKDIR /app

# Copy source files
COPY main.cpp ./
COPY CMakeLists.txt ./

# Build the application
RUN mkdir build && cd build && \
    cmake .. && \
    make

EXPOSE 8001

# Run the application
CMD ["./build/image_processor"]
