# Stronghold

Stronghold is a security-focussed web browser developed using the Electron Chromium framework, with a primary focus in teaching children safe browsing habits through behavioural conditioning and gamification. They are not just kept safe online, but are educated and taught why certain actions are considered bad.

---

## Features

### Security Features
 
 - Penalises HTTP usage
 - Analyses the characteristics of a domain
 - Checks the age of the domain being accessed
 - Checks the security headers of the domain being accessed
 - Blocks sites with invalid or misconfigured TLS certificates
 - Checks the similarity of entered URLs to common known ones
 - Blocks and warns against downloads of common malicious files like MSI, EXE, PS1 etc.
 - Deletes all cookies when the browser is closed 

### Educational Features
 
 - Security dashboard which tracks blocked sites, blocked downloads, ignored warnings, recent XP changes, XP level, and safe day streak
 - Quiz system which allows the completion of both daily and weekly quizzes with a security focus for XP rewards 
   

### User Features
 
 - Gamification with a levelling system and experience points while browsing
 - Google OAUTH login with Firebase authentication
 - Guest browsing mode with strict settings enabled
 - Cutomisable security and download protection levels

---

## Technologies Used
 
 - Electron: The overall framework used for development
 - JavaScript: Used for core logic and linking to Electron
 - HTML & CSS: Used for user interface creation
 - Firebase: Stores backend data for users and quizzes
 - whois-json: Domain age lookup for risk score calculation
 - tldts: Domain parsing
 - talisman: Typosquatting detection using Damerau-Levenshtein algorithm
 - Python: Hosting of a local server to test the browser

---

## Installation Instructions

 - Clone the repository (git clone https://github.com/Mark7567/COMP3000)
 - Install relevant dependencies (npm install talisman, npm install whois-json, npm install tldts)
 - Open terminal and host a local server on port 1000 (python3 -m http.server 1000)
 - Start the browser (npm start)

---

## Usage

 - Launch the browser by typing 'npm start' in a terminal
 - Sign in with a Google account or continue as a guest
 - Enter a URL or search query
 - Interract with warnings, blocks, settings, and quizzes
 - Track safety progress through the stats in the dashboard

---

## Limitations / Future Improvements

 - No parental control PIN as initially planned
 - Limited quiz dataset which needs to be expanded
 - No redirect analysis
 - Future plans for an integrated AI assistant to personalise questions to the user's safety habits
 - Plans for an integrated VPN

---

## Author
Mark Hardy
BSc (Hons) Computer Science (Cyber Security)
University of Plymouth
