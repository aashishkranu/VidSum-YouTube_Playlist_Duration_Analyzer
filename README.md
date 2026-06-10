# VidSum

A web application that analyzes YouTube playlists and provides detailed duration insights, playback speed calculations, and watch-time planning.

## Features

- Calculate total playlist duration instantly
- View duration at different playback speeds (1x, 1.25x, 1.5x, 1.75x, 2x)
- Estimate completion time based on daily watch hours
- Search and filter playlist videos
- Sort videos by duration or playlist order
- Export playlist data as:
  - Plain Text
  - Markdown
  - CSV
- Local storage support for API key and recent data
- Demo mode available without an API key

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- YouTube Data API v3

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd folder-name
```

### 2. Open the Application

Simply open `index.html` in any modern browser.

No installation or backend server is required.

## YouTube API Setup

To analyze live YouTube playlists, you'll need a YouTube Data API v3 key.

1. Create a project in Google Cloud Console.
2. Enable **YouTube Data API v3**.
3. Create an API key.
4. Enter the API key in the application's API Key section.

## Usage

1. Enter a YouTube playlist URL or Playlist ID.
2. Provide your YouTube API key.
3. Click **Analyze Playlist**.
4. Explore duration statistics, playback speed calculations, and watch plans.

## Demo Mode

You can use the built-in Demo Mode to test all features without a YouTube API key.

## Project Structure

```text
/
├── index.html
├── README.md
```

## Future Improvements

- Playlist history
- Dark/Light theme support
- Advanced analytics
- Data visualization charts
- Shareable playlist reports

## License

This project is licensed under the MIT License.
