#!/usr/bin/env bash

# This script takes a JSON array of file changes, converts it to a unified diff,
# and attempts to apply it using git apply.

set -euo pipefail

JSON_INPUT="$(cat)"

# Check if JSON input is empty
if [ -z "$JSON_INPUT" ] || [ "$JSON_INPUT" = "[]" ]; then
  echo "No changes provided in JSON input." >&2
  exit 0
fi

# Generate a temporary patch file
PATCH_FILE=$(mktemp)

# Convert JSON changes to unified diff format
# This is a simplified example and might need more sophisticated logic
# to handle all edge cases of diff generation (e.g., context lines).
# For now, it focuses on add/remove/replace based on line numbers.

# Initialize diff content
DIFF_CONTENT=""

# Parse JSON and generate diff content
jq -c '.[]' <<< "$JSON_INPUT" | while read -r file_obj; do
  FILE_PATH=$(echo "$file_obj" | jq -r '.file')
  CHANGES=$(echo "$file_obj" | jq -c '.changes[]')

  if [ -z "$FILE_PATH" ]; then
    echo "Error: Missing file path in JSON object: $file_obj" >&2
    continue
  fi

  # Add diff header for the file
  DIFF_CONTENT+="--- a/$FILE_PATH\n"
  DIFF_CONTENT+="+++ b/$FILE_PATH\n"

  # Read original file content into an array
  ORIGINAL_LINES=()
  if [ -f "$FILE_PATH" ]; then
    mapfile -t ORIGINAL_LINES < "$FILE_PATH"
  fi

  # Track line numbers for diff generation
  OLD_LINE_NUM=1
  NEW_LINE_NUM=1
  DIFF_BLOCK_START_OLD=0
  DIFF_BLOCK_START_NEW=0
  DIFF_BLOCK_LINES_OLD=0
  DIFF_BLOCK_LINES_NEW=0

  # Process changes
  echo "$CHANGES" | while read -r change_obj; do
    CHANGE_TYPE=$(echo "$change_obj" | jq -r '.type')
    LINE_NUMBER=$(echo "$change_obj" | jq -r '.lineNumber')
    CONTENT=$(echo "$change_obj" | jq -r '.content')
    OLD_CONTENT=$(echo "$change_obj" | jq -r '.oldContent')
    NEW_CONTENT=$(echo "$change_obj" | jq -r '.newContent')

    # Simplified diff logic - needs improvement for real-world use
    # This will generate a diff that might not be perfectly optimized
    # but should be syntactically correct for git apply.

    case "$CHANGE_TYPE" in
      "add")
        # Add context lines before the change
        for ((i = LINE_NUMBER - 3; i < LINE_NUMBER; i++)); do
          if (( i >= 1 && i <= ${#ORIGINAL_LINES[@]} )); then
            DIFF_CONTENT+=" $(printf '%s\n' "${ORIGINAL_LINES[i-1]}")\n"
            DIFF_BLOCK_LINES_OLD=$((DIFF_BLOCK_LINES_OLD + 1))
            DIFF_BLOCK_LINES_NEW=$((DIFF_BLOCK_LINES_NEW + 1))
          fi
        done
        DIFF_CONTENT+="+$CONTENT\n"
        DIFF_BLOCK_LINES_NEW=$((DIFF_BLOCK_LINES_NEW + 1))
        ;;
      "remove")
        # Add context lines before the change
        for ((i = LINE_NUMBER - 3; i < LINE_NUMBER; i++)); do
          if (( i >= 1 && i <= ${#ORIGINAL_LINES[@]} )); then
            DIFF_CONTENT+=" $(printf '%s\n' "${ORIGINAL_LINES[i-1]}")\n"
            DIFF_BLOCK_LINES_OLD=$((DIFF_BLOCK_LINES_OLD + 1))
            DIFF_BLOCK_LINES_NEW=$((DIFF_BLOCK_LINES_NEW + 1))
          fi
        done
        DIFF_CONTENT+="-$CONTENT\n"
        DIFF_BLOCK_LINES_OLD=$((DIFF_BLOCK_LINES_OLD + 1))
        ;;
      "replace")
        # Add context lines before the change
        for ((i = LINE_NUMBER - 3; i < LINE_NUMBER; i++)); do
          if (( i >= 1 && i <= ${#ORIGINAL_LINES[@]} )); then
            DIFF_CONTENT+=" $(printf '%s\n' "${ORIGINAL_LINES[i-1]}")\n"
            DIFF_BLOCK_LINES_OLD=$((DIFF_BLOCK_LINES_OLD + 1))
            DIFF_BLOCK_LINES_NEW=$((DIFF_BLOCK_LINES_NEW + 1))
          fi
        done
        DIFF_CONTENT+="-$OLD_CONTENT\n"
        DIFF_CONTENT+="+$NEW_CONTENT\n"
        DIFF_BLOCK_LINES_OLD=$((DIFF_BLOCK_LINES_OLD + 1))
        DIFF_BLOCK_LINES_NEW=$((DIFF_BLOCK_LINES_NEW + 1))
        ;;
    esac
  done

  # Add diff hunk header (simplified, assumes single hunk per file for now)
  # This needs to be more dynamic for multiple changes within a file
  if [ -n "$DIFF_CONTENT" ]; then
    # Prepend hunk header. This is a very basic approximation.
    # Real diff generation is complex and considers context lines.
    DIFF_CONTENT="@@ -${OLD_LINE_NUM},${DIFF_BLOCK_LINES_OLD} +${NEW_LINE_NUM},${DIFF_BLOCK_LINES_NEW} @@\n"${DIFF_CONTENT}
  fi

done

# Write the generated diff to the temporary file
echo -e "$DIFF_CONTENT" > "$PATCH_FILE"

# Attempt to apply the patch
git apply --check "$PATCH_FILE"
if [ $? -eq 0 ]; then
  git apply "$PATCH_FILE"
  echo "Patch applied successfully." >&2
  rm "$PATCH_FILE"
  exit 0
else
  echo "Failed to apply patch. Saving to $PATCH_FILE for manual review." >&2
  exit 1
fi
