Remove-Item -Recurse -Force node_modules
cd ..
docker compose build --no-cache
docker compose up -d