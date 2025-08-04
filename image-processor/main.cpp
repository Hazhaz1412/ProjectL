#include <opencv2/opencv.hpp>
#include <crow.h>
#include <string>
#include <vector>
#include <iostream>

using namespace cv;
using namespace std;

Mat convertToGrayscale(const Mat& inputImage) {
    Mat grayImage;
    cvtColor(inputImage, grayImage, COLOR_BGR2GRAY);
    return grayImage;
}

Mat base64ToMat(const string& base64String) {
    string decoded = crow::utility::base64decode(base64String);
    vector<uchar> data(decoded.begin(), decoded.end());
    return imdecode(data, IMREAD_COLOR);
}

string matToBase64(const Mat& image) {
    vector<uchar> buffer;
    imencode(".jpg", image, buffer);
    string encoded = crow::utility::base64encode(string(buffer.begin(), buffer.end()));
    return encoded;
}

int main() {
    crow::SimpleApp app;
    CROW_ROUTE(app, "/health").methods("GET"_method)([]{
        return crow::response(200, "application/json", R"({"status": "ok"})");
    });

    CROW_ROUTE(app, "/info").methods("GET"_method)([]{
        return crow::response(200, "application/json", 
            R"({"service": "Image Processor C++", "version": "1.0.0", "opencv_version": ")" + 
            string(CV_VERSION) + R"("})");
    });
    CROW_ROUTE(app, "/convert-grayscale").methods("POST"_method)([](const crow::request& req){
        try {
            auto json = crow::json::load(req.body);
            if (!json || !json.has("image")) {
                return crow::response(400, "application/json", 
                    R"({"error": "Missing 'image' field in request body"})");
            }

            string base64Image = json["image"].s();
            Mat inputImage = base64ToMat(base64Image);
            
            if (inputImage.empty()) {
                return crow::response(400, "application/json", 
                    R"({"error": "Invalid image data"})");
            }

            Mat grayImage = convertToGrayscale(inputImage);

            // Tạo thư mục lưu nếu chưa có
            string saveDir = "/app/processed_images";
            system(("mkdir -p " + saveDir).c_str());

            // Tạo tên file duy nhất (dùng timestamp)
            auto t = std::time(nullptr);
            auto tm = *std::localtime(&t);
            char filename[64];
            snprintf(filename, sizeof(filename), "%ld.jpg", static_cast<long>(t));
            string filePath = saveDir + "/" + filename;

            // Lưu ảnh ra file
            imwrite(filePath, grayImage);

            crow::json::wvalue response;
            response["success"] = true;
            response["index"] = filename;
            response["file_path"] = filePath;
            response["original_size"] = to_string(inputImage.rows) + "x" + to_string(inputImage.cols);
            response["processed_size"] = to_string(grayImage.rows) + "x" + to_string(grayImage.cols);

            return crow::response(200, "application/json", response.dump());
        }
        catch (const exception& e) {
            crow::json::wvalue error;
            error["success"] = false;
            error["error"] = e.what();
            return crow::response(500, "application/json", error.dump());
        }
    });

    cout << "Image Processor C++ Service starting on port 8001..." << endl;
    app.port(8001).multithreaded().run();
    return 0;
}
