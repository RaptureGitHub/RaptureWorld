// Configure these constants
const GITHUB_TOKEN = "insert_token_here"; // Replace with your GitHub token
const GITHUB_REPO = "RaptureGitHub/RaptureWorld"; // Replace with your GitHub repo (e.g., "user/repo")
const FILE_PATH = "UserData.json"; // Path for the JSON file in the repository
const BRANCH = "main"; // Target branch
  const targetSheetName = "Stafflist"; // Target Sheet

/**
 * Create a debounced version of the passed function
 * @param {Function} fn The function to be debounced
 * @param {number} ms The delay time in milliseconds
 * @returns {Function} The debounced version of the passed function
 */
function debounce_(fn, ms) {
  return (...args) => {
    // 1. set state in user storage for the passed function
    const storage = PropertiesService.getUserProperties();
    const state = Date.now().toString();
    const key = fn.name;
    storage.setProperty(key, state);
    // 2. sleep
    Utilities.sleep(ms);
    // 3. state check
    if (storage.getProperty(key) != state) {
      // a. ignore if state was changed
      return;
    }
    // b. execute the passed function if the state is the same
    return fn(...args);
  };
}

function onEditDebounced(e){
    debounce_(onEdit_, 60000)(e);
}
/**
 * Triggered when the sheet is updated.
 */
function onEdit_(e) {
  const editedSheet = e.source.getActiveSheet();

  if (editedSheet.getName() !== targetSheetName) {
    return; // Exit early if the wrong sheet was edited
  }

  const jsonData = generateJSON(); // Generate JSON from the spreadsheet
  commitToGitHub(jsonData); // Commit the JSON to GitHub
}

/**
 * Reads the spreadsheet data and transforms it into the desired JSON format.
 */
function generateJSON() {
  const targetSheetName = "Stafflist";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
  const data = sheet.getDataRange().getValues();

  // Extract header row (roles) and data rows
  const headers = data[0].slice(1); // Skip the "Name" column
  const jsonData = {};

  // Iterate through each row and build the JSON structure
  for (let i = 1; i < data.length; i++) {
    const name = data[i][0]; // First column is the name
    if (!name) continue; // Skip empty names

    const roles = [];
    for (let j = 1; j < data[i].length; j++) {
      if (data[i][j] === "x") { // Check for 'x' in role columns
        roles.push(headers[j - 1]); // Map the column header (role) to the name
      }
    }

    jsonData[String(name)] = { roles }; // Assign roles to the name
  }

  return JSON.stringify(jsonData, null, 2); // Convert to JSON string
}

/**
 * Commits the JSON data to GitHub.
 */
function commitToGitHub(jsonData) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;

  // Get the current file's SHA (required for updates)
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const content = JSON.parse(response.getContentText());
  const sha = content.sha;

  // Prepare the request payload for GitHub
  const payload = {
    message: "Update JSON data from Google Sheets",
    content: Utilities.base64Encode(jsonData, Utilities.Charset.UTF_8), // Force UTF-8 encoding
    branch: BRANCH,
    sha, // Required for updating an existing file
  };

  // Send the update request to GitHub
  UrlFetchApp.fetch(url, {
    method: "put",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
    payload: JSON.stringify(payload),
  });
}
