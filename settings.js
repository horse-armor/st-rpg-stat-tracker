import {
    extension_settings,
    renderExtensionTemplateAsync,
} from "../../../../scripts/extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { defaultInstructionPrompt, defaultInstructionPromptMajorVersion, extensionName } from "./consts.js";

export const rpgSettings = {
    enabled: true,
    allowHallucinated: true,
    verboseStatChanges: false,
    instructionPrompt: defaultInstructionPrompt,
    instructionPromptVersion: defaultInstructionPromptMajorVersion,
};

export async function loadRpgSettings() {
    if (extension_settings[extensionName]) {
        for (const key in rpgSettings) {
            if (extension_settings[extensionName][key] === undefined) {
                extension_settings[extensionName][key] = rpgSettings[key];
            }
        }

        Object.assign(rpgSettings, extension_settings[extensionName]);

        if (rpgSettings.instructionPromptVersion < defaultInstructionPromptMajorVersion)
            rpgSettings.instructionPrompt = defaultInstructionPrompt;
    } else {
        extension_settings[extensionName] = structuredClone(rpgSettings);
    }

    const settingsHtml = $(await renderExtensionTemplateAsync(extensionName, "settings", rpgSettings));
    $("#extensions_settings").append(settingsHtml);

    $("#rpg_enabled").prop("checked", rpgSettings.enabled);
    $("#rpg_enabled").on("change", onEnabledChange);

    $("#rpg_hallucinated_stats").prop("checked", rpgSettings.allowHallucinated);
    $("#rpg_hallucinated_stats").on("change", onHallucinatedChange);

    $("#rpg_verbose_stats").prop("checked", rpgSettings.verboseStatChanges);
    $("#rpg_verbose_stats").on("change", onVerboseChange);

    $("#rpg_instruction_prompt").val(rpgSettings.instructionPrompt);
    $("#rpg_instruction_prompt").on("input", onInstructionPromptChange);
}

function onEnabledChange() {
    rpgSettings.enabled = Boolean($(this).prop("checked"));
    extension_settings[extensionName] = rpgSettings;
    saveSettingsDebounced();
}

function onHallucinatedChange() {
    rpgSettings.allowHallucinated = Boolean($(this).prop("checked"));
    extension_settings[extensionName] = rpgSettings;
    saveSettingsDebounced();
}

function onVerboseChange() {
    rpgSettings.verboseStatChanges = Boolean($(this).prop("checked"));
    extension_settings[extensionName] = rpgSettings;
    saveSettingsDebounced();
}

function onInstructionPromptChange() {
    rpgSettings.instructionPrompt = String($(this).val());
    extension_settings[extensionName] = rpgSettings;
    saveSettingsDebounced();
}