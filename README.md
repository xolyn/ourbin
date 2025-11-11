# OurBin - LAN Clipboard

A LAN clipboard project based on Python FastAPI + SQLite, supporting creation, editing, management, and sharing of text content.

[【简体中文】](README_zh.md)

## Features

### Core Features
- ✅ Create clipboard content (supports custom expiration time, from minutes to permanent)
- ✅ Access and edit clipboard content via UUID
- ✅ Soft delete functionality (sets expiration time to 1970)
- ✅ List all valid clipboard content
- ✅ Batch operations (select, delete, renew)
- ✅ Sorting functionality (by creation time, expiration time)
- ✅ Clean up expired bins
- ✅ Database reset (with security confirmation)
- ✅ RESTful API design

### Frontend Features
- 🪶 Zero dependency! Pure HTML+CSS.
- 📋 Import content from clipboard
- 🔍 Real-time search and filtering
- 📊 Display creation time and expiration time
- 🔄 Auto-refresh list
- 📝 Online content editing
- 🔗 One-click copy URL or content
- ⏰ Expiration time display

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLite
- **Frontend**: HTML5, JavaScript (Vanilla)
- **Deployment**: Docker, Docker Compose
- **Server**: Uvicorn (ASGI)

## Quick Start

### Method 1: Docker Deployment (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd ourbin
```

2. **Create data directory**
```bash
mkdir -p data
```

3. **Configure port (optional)**
Create a `.env` file:
```bash
CUSTOM_PORT=8000
```

4. **Start the service**
```bash
docker-compose up -d
```

5. **View logs**
```bash
docker-compose logs -f
```

6. **Stop the service**
```bash
docker-compose down
```

The service will start at `http://localhost:8000` (or your configured port)

### Method 2: Local Run

1. **Install dependencies**
```bash
pip install -r requirements.txt
```

2. **Run the service**
```bash
python app.py
```

The service will start at `http://localhost:8000`

## API Documentation

After starting the service, you can access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Create Clipboard Content
```http
POST /api/bins
Content-Type: application/json

{
    "content": "Clipboard content",
    "expiration_hours": 24  // Supports decimals, e.g., 0.083 means 5 minutes
}
```

**Response**:
```json
{
    "uuid": "4cd4a4d332cb",
    "creation_time": 1704067200,
    "content": "Clipboard content",
    "expiration_time": 1704153600
}
```

### Get Clipboard Content
```http
GET /api/bins/{uuid}
```

### Update Clipboard Content
```http
PUT /api/bins/{uuid}
Content-Type: application/json

{
    "content": "New content"
}
```

### Delete Clipboard Content (Soft Delete)
```http
DELETE /api/bins/{uuid}
```

Supports batch deletion, multiple UUIDs separated by commas:
```http
DELETE /api/bins/{uuid1},{uuid2},{uuid3}
```

### List All Clipboard Content
```http
GET /api/bins?sort_by=creation_time&order=desc
```

**Query Parameters**:
- `sort_by`: Sort field (`creation_time`, `expiration_time`)
- `order`: Sort order (`asc`, `desc`)

**Response**:
```json
[
    {
        "uuid": "4cd4a4d332cb",
        "creation_time": 1704067200,
        "expiration_time": 1704153600,
        "preview": "Clipboard content preview..."
    }
]
```

### Batch Renew (Add 1 Day)
```http
PUT /api/bins/renew
Content-Type: application/json

{
    "uuids": ["uuid1", "uuid2", "uuid3"]
}
```

### Clean Up Expired Bins
```http
DELETE /api/bins/cleanup
```

Deletes all records where `expiration_time <= current_time`.

### Reset Database
```http
DELETE /api/bins/reset
```

⚠️ **Warning**: This operation will delete all data (`TRUNCATE TABLE`)!

### Health Check
```http
GET /api/health
```

**Response**:
```json
{
    "status": "healthy",
    "version": "1.0.1"
}
```

## Database Schema

```sql
CREATE TABLE bins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    creation_time INTEGER NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT,
    expiration_time INTEGER NOT NULL
);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PATH` | Database file path | `ourbin.db` |
| `PORT` | Service port | `8000` |
| `CUSTOM_PORT` | Docker mapped port | `8000` |

## Data Persistence

### Docker Deployment
Database file is saved in `./data/ourbin.db`, persisted through Docker volume mount. Data will be preserved even if the container is deleted and recreated.

### Local Deployment
Database file is saved in `ourbin.db` in the project root directory (or the path specified by the `DB_PATH` environment variable).

## Frontend Usage

### Main Page (`index.html`)
- Create new bins
- View all bin list
- Select, delete, renew bins
- Sort and filter
- Import content from clipboard

### Bin Detail Page (`bin.html`)
- View complete bin content
- Edit and save content
- Copy URL or content
- Delete bin

### Danger Zone
Double-click the version number to show the danger zone:
- **Clean up**: Clean all expired bins
- **Reset**: Reset database (requires 6-digit confirmation ID)

## Expiration Time Notes

- Supports minute-level precision (e.g., 5 minutes = 0.083 hours)
- Setting to `-1` means never expires (actually set to a date far in the future)
- Bins with expiration time over 1 year display as `--` or `Never` in the interface

## Development

### Project Structure
```
ourbin/
├── app.py              # FastAPI application
├── index.html          # Main page
├── bin.html           # Bin detail page
├── common.css         # Common styles
├── requirements.txt   # Python dependencies
├── Dockerfile         # Docker image definition
├── docker-compose.yml # Docker Compose configuration
└── README.md          # Project documentation
```

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py

# Access frontend
# Open index.html or access through a web server
```

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!


