cmake_minimum_required(VERSION 3.10)
project(image_processor)

set(CMAKE_CXX_STANDARD 17)

# Find OpenCV
find_package(OpenCV REQUIRED)

# Find Crow
find_package(PkgConfig REQUIRED)
pkg_check_modules(CROW REQUIRED crow)

# Add executable
add_executable(image_processor main.cpp)

# Link libraries
target_link_libraries(image_processor ${OpenCV_LIBS})
target_link_libraries(image_processor ${CROW_LIBRARIES})

# Include directories
target_include_directories(image_processor PRIVATE ${OpenCV_INCLUDE_DIRS})
target_include_directories(image_processor PRIVATE ${CROW_INCLUDE_DIRS})
