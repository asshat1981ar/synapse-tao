#!/usr/bin/env bash

# This script takes a JSON array of file objects (path and content),
# writes the content to the files, generates a unified diff, and applies it.

set -euo pipefail

JSON_INPUT="$(cat)"

# Check if JSON input is empty
if [ -z "$JSON_INPUT" ] || [ "$JSON_INPUT" = "[]" ]; then
  echo "No file changes provided in JSON input." >&2
  exit 0
fi

# Create a temporary directory to store original files for diffing
TEMP_DIR=$(mktemp -d)

# Store original file contents and create new ones
FILES_TO_DIFF=()

jq -c '.[]' <<< "$JSON_INPUT" | while read -r file_obj; do
  FILE_PATH=$(echo "$file_obj" | jq -r '.file')
  NEW_CONTENT=$(echo "$file_obj" | jq -r '.content')

  if [ -z "$FILE_PATH" ]; then
    echo "Error: Missing file path in JSON object: $file_obj" >&2
    continue
  fi

  # Add file to list for diffing
  FILES_TO_DIFF+=("$FILE_PATH")

  # Create parent directory if it doesn't exist
  mkdir -p "$(dirname "$FILE_PATH")"

  # Save original content to temp directory for diffing
  if [ -f "$FILE_PATH" ]; then
    cp "$FILE_PATH" "$TEMP_DIR/$FILE_PATH"
  else
    # If new file, create an empty original in temp for diffing
    touch "$TEMP_DIR/$FILE_PATH"
  fi

  # Write new content to the actual file
  echo -n "$NEW_CONTENT" > "$FILE_PATH"

done

# Generate unified diff
# Use git diff to generate the patch between original and new files
# This assumes the current directory is a git repository
PATCH_CONTENT=""
for FILE in "${FILES_TO_DIFF[@]}"; do
  if [ -f "$TEMP_DIR/$FILE" ] || [ -f "$FILE" ]; then
    # Use git diff to compare the original (in temp) with the new (actual file)
    # Need to handle new files and deleted files properly
    if [ -f "$TEMP_DIR/$FILE" ] && [ -f "$FILE" ]; then
      # Modified file
      DIFF=$(git diff --no-index "$TEMP_DIR/$FILE" "$FILE" || true)
    elif [ -f "$TEMP_DIR/$FILE" ] && [ ! -f "$FILE" ]; then
      # Deleted file (content in temp, but not in actual)
      DIFF=$(git diff --no-index -- "$TEMP_DIR/$FILE" /dev/null || true)
    elif [ ! -f "$TEMP_DIR/$FILE" ] && [ -f "$FILE" ]; then
      # New file (empty in temp, content in actual)
      DIFF=$(git diff --no-index /dev/null "$FILE" || true)
    else
      # Should not happen if logic is correct
      continue
    fi

    if [ -n "$DIFF" ]; then
      # Adjust paths in diff to be relative to current directory
      DIFF=$(echo "$DIFF" | sed "s|a/$TEMP_DIR/|a/|" | sed "s|b/$TEMP_DIR/|b/|")
      PATCH_CONTENT+="$DIFF\n"
    fi
  fi
done

# Clean up the temporary directory
rm -rf "$TEMP_DIR"

# If no changes, exit successfully
if [ -z "$PATCH_CONTENT" ]; then
  echo "No changes detected, no patch generated." >&2
  exit 0
fi

# Apply the generated patch
# Create a temporary patch file for git apply
GENERATED_PATCH_FILE=$(mktemp)
echo -e "$PATCH_CONTENT" > "$GENERATED_PATCH_FILE"

git apply --check "$GENERATED_PATCH_FILE"
if [ $? -eq 0 ]; then
  git apply "$GENERATED_PATCH_FILE"
  echo "Patch applied successfully." >&2
  rm "$GENERATED_PATCH_FILE"
  exit 0
else
  echo "Failed to apply patch. Saving to $GENERATED_PATCH_FILE for manual review." >&2
  exit 1
fi
