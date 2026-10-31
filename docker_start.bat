@echo off
echo Starting Multi-Branch SaaS Digital Menu Docker Containers...
docker compose --env-file .env.docker up --build -d
echo.
echo ==============================================================
echo Multi-Branch SaaS Digital Menu is up and running!
echo ==============================================================
echo Unified Gateway:    http://localhost:8080
echo Admin Dashboard:    http://localhost:3000 (or http://localhost:8080/admin)
echo Digital Menu Web:   http://localhost:3002 (or http://localhost:8080/)
echo Backend API Docs:   http://localhost:8011/docs (or http://localhost:8080/api/docs)
echo PostgreSQL:         localhost:5432 (digitalmenu_db)
echo ==============================================================
