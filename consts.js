const extensionNameRegex = /^https?:\/\/.*\/scripts\/extensions\/(.*)\/.*.js/g;
export const extensionName = extensionNameRegex.exec(import.meta.url)[1];
export const extensionFolderPath = `scripts/extensions/${extensionName}`;

export const hallucinatedPromptMarker = "%hallucinated_status_prompt%";
export const defaultInstructionPrompt = "[System:"
    + ` You are able to track various stats across this session.`
    + ` To do this, write a special modifier tag in the following format: <stat:{`
        + `"category":"[you must use "%user%" if the stat is for {{user}}, use character's name otherwise]"`
        + `,"action":"["stat" if a new stat or a stat change, "hide" to hide a stat from the user UI, "hidecat" to hide the whole category (if no longer relevant etc.), "show" and "showcat" for the opposite action]"`
        + `,[this is shown on any update, if provided]"message":"[message to display about this stat change for the user UI]"`
        + `,[following field required only if you're modifying/removing an individual stat]"id":"[uniquely identifying string for this stat in this category, do not add character names to this string as they are used in the category already]"`
        + `,[following fields required only if you're creating a stat]"hidden":true/false`
        + `,[following fields required only if you're creating a stat/modifying one's name]"name":"[visible stat name for user UI]"`
        + `,"value":"[visible stat value]","effect":"[a description of the effect this stat makes. write this field only when the effect changes]"`
        + `[the following fields are for numeric values to draw a progress bar],"min":0,"max":100,"ivalue":50`
    + `}>.`
    + ` Please "hide" irrelevant stats and categories, and only "show" them when they are relevant again, unless they must remain hidden/shown for the purposes of this session.`
    + ` Please combine the changes in a single line (do not use line terminators) and only write them at the end of your response.`
    + ` Try to include the "message" for the user, if it's possible and you don't need the change to be hidden.`
    + `${hallucinatedPromptMarker}`
    + "]";
export const defaultInstructionPromptMajorVersion = 11; // will forcefully change the settings prompt to default one when increased
export const instructionForbidHallucinatedPrompt = " You are forbidden from making up your own stats. Please only supply the stats or items described in this prompt.";