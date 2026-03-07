#!/bin/bash
# Build script: builds the React frontend and copies everything needed for LAMP deployment
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/public"

echo "Building React frontend..."
cd "$PROJECT_ROOT/client"

# Temporarily update vite config for /api base
VITE_ENV="VITE_API_BASE=/api" npm run build

echo "Copying built files..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy built frontend
cp -r "$PROJECT_ROOT/client/dist/"* "$OUTPUT_DIR/"

# Copy images and music
cp -r "$PROJECT_ROOT/client/public/images" "$OUTPUT_DIR/"
cp -r "$PROJECT_ROOT/client/public/music" "$OUTPUT_DIR/"

# Copy .htaccess to public root
cp "$SCRIPT_DIR/.htaccess" "$OUTPUT_DIR/"

# Copy API
cp -r "$SCRIPT_DIR/api" "$OUTPUT_DIR/"

# Copy game data for seeding
mkdir -p "$OUTPUT_DIR/data"
cp "$PROJECT_ROOT/data/palme_game_data_v2.json" "$OUTPUT_DIR/data/"

echo ""
echo "Build complete! Output in: $OUTPUT_DIR"
echo ""
echo "To deploy:"
echo "  1. Upload contents of $OUTPUT_DIR to your web root"
echo "  2. Create MySQL database: mysql < sql/schema.sql"
echo "  3. Edit api/config.php with your DB credentials and API key"
echo "  4. Seed database: php api/../sql/seed.php"
echo "  5. Ensure mod_rewrite is enabled"
