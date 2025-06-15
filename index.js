import {
    setExtensionPrompt,
    getSystemMessageByType,
    updateMessageBlock,
    addOneMessage,
    eventSource,
    doNavbarIconClick,
    chat,
    chat_metadata,
    name1,
    event_types,
    extension_prompt_types
} from "../../../../script.js";
import {
    getContext,
    renderExtensionTemplateAsync,
} from "../../../../scripts/extensions.js";
import { extensionName, hallucinatedPromptMarker, instructionForbidHallucinatedPrompt } from "./consts.js";
import { rpgSettings, loadRpgSettings } from "./settings.js";

const METADATA_SAVES_KEY = "_saves";
const METADATA_HIDDEN_CATEGORIES_KEY = "_hidden_categories";

const METADATA_USER_WILDCARD = "%user%";

(function () {
    const log = (message) => console.log(`[${extensionName}] ${message}`);

    const showProgressForStat = (stat) => !isNaN(stat.ivalue) && !isNaN(stat.min) && !isNaN(stat.max);

    const EXT_PROMPT_ID = "RPGST_PROMPT";
    async function rpgInterceptor(chat, contextSize, type) {
        if (!rpgSettings.enabled) {
            setExtensionPrompt(EXT_PROMPT_ID, "");
            return;
        }

        if (chat.length >= 3 && chat[chat.length-2].extra?.rpgs_data || chat.length < 3) {
            // restore previous stat data
            chat_metadata[extensionName] = (chat.length < 3) ? {} : structuredClone(chat[chat.length-2].extra?.rpgs_data);
            await renderStatBlock();
        }

        const instructionPrompt = rpgSettings.instructionPrompt.replace(hallucinatedPromptMarker, rpgSettings.allowHallucinated ? "" : instructionForbidHallucinatedPrompt);
        let statsPrompt = "";

        const allStats = chat_metadata[extensionName];
        if (allStats) {
            let statsParts = [];
            for (const charId in allStats) {
                if (charId == METADATA_SAVES_KEY) continue;
                const stats = allStats[charId];
                for (const category in stats) {
                    if (category === METADATA_HIDDEN_CATEGORIES_KEY) continue;

                    const categoryStats = [];
                    for (const id in stats[category]) {
                        const stat = stats[category][id];
                        if (stat.hidden) continue;

                        categoryStats.push(`- ${stat.name}: ${stat.value}${showProgressForStat(stat) ? (` ${stat.ivalue}/[${stat.min}-${stat.max}]`) : ""}${stat.effect ? (" - "+stat.effect) : ""}`);
                    }

                    if (categoryStats.length > 0) {
                        statsParts.push(`${(category === METADATA_USER_WILDCARD) ? name1 : category}:\n${categoryStats.join('\n')}`);
                    }
                }
            }

            if (statsParts.length > 0) {
                statsPrompt = `[Current stats:\n${statsParts.join('\n\n')}]`;
            }
        }

        const fullPrompt = `${instructionPrompt}\n${statsPrompt}`;
        setExtensionPrompt(EXT_PROMPT_ID, fullPrompt, extension_prompt_types.IN_PROMPT, 0);
    }

    async function initializeStatTab() {
        const template = await renderExtensionTemplateAsync(extensionName, "stat_tab", {});
        // $("#top-settings-holder").append(template);
        $(template).insertBefore("#rightNavHolder");

        const button = "#rpg-stats-button > div";
        $(button).on("click", doNavbarIconClick);

        const navPanel = "#rpg-stats-button > .drawer-content";
        const navDrawerIcon = "#rpg-stats-button > div > div";
        $("#rpgst_button_panel_pin").on("click", function() {
            if (this.checked) {
                $(navPanel).addClass("pinnedOpen");
                $(navDrawerIcon).addClass("drawerPinnedOpen");
            } else {
                $(navPanel).removeClass("pinnedOpen");
                $(navDrawerIcon).removeClass("drawerPinnedOpen");

                if ($(navPanel).hasClass("openDrawer") && $(".openDrawer").length > 1) {
                    const toggle = $(button);
                    doNavbarIconClick.call(toggle);
                }
            }
        });
    }

    async function renderStatBlock() {
        if (!rpgSettings.enabled) {
            $("#rpg-stat-block").html("");
            return;
        }

        if (!chat_metadata[extensionName]) {
            chat_metadata[extensionName] = {};
        }

        const allStats = chat_metadata[extensionName];
        if (!allStats || !Object.keys(allStats).length) {
            $("#rpg-stat-block").html("");
            return;
        }

        const statsForRender = structuredClone(allStats);
        for (const charId in statsForRender) {
            const charStats = statsForRender[charId];
            const hiddenCategories = charStats[METADATA_HIDDEN_CATEGORIES_KEY] || [];
            for (const categoryName of hiddenCategories) {
                delete charStats[categoryName];
            }
            delete charStats[METADATA_HIDDEN_CATEGORIES_KEY];

            if (charStats[METADATA_USER_WILDCARD]) {
                charStats[name1] = charStats[METADATA_USER_WILDCARD];
                delete charStats[METADATA_USER_WILDCARD];
            }

            for (const categoryName in charStats) {
                const category = charStats[categoryName];
                for (const statId in category) {
                    const stat = category[statId];
                    stat.showProgress = showProgressForStat(stat);
                }
            }
        }

        const template = await renderExtensionTemplateAsync(extensionName, "stat_block", { stats: statsForRender });
        $("#rpg-stat-block").html(template);
    }

    function sendStatsMessage(type, text, extra) {
        const newMessage = getSystemMessageByType(type, text, extra);
        newMessage.name = "Stats";
        chat.push(newMessage);
        addOneMessage(newMessage);
    }

    async function handleMessage(message) {
        if (!message.extra) message.extra = {};
        if (!rpgSettings.enabled || message.is_user || message.is_system) {
            message.extra.rpgs_data = structuredClone(chat_metadata[extensionName] || {});
            return;
        }

        const msgid = chat.length-1;

        const statRegex = /<stat:({.*?})>/g;
        let match, foundStat = false;
        const notifications = [], allData = [];
        while ((match = statRegex.exec(message.mes)) !== null) {
            try {
                const data = JSON.parse(match[1]);
                
                foundStat = true;
                allData.push(data);

                const notification = await updateStat(data);
                if (notification) notifications.push(notification);
            } catch (e) {
                log(`Error parsing stat update: ${e.message}`);
                log(`Faulty stat data: ${match[1]}`);
            }
        }
        // if (notifications.length) sendStatsMessage(system_message_types.GENERIC, notifications.join("\n"), { isSmallSys: true, rpgs_notifications: true });
        // /\/\/\ doesn't work with swipes

        if (foundStat) {
            await renderStatBlock();

            message.extra.rpgs_parsed_stats = allData;
            message.mes = message.mes.replace(statRegex, "").trim();
            if (notifications.length) message.mes += "\n\n\n" + notifications.map(n => `*${n}*`).join("\n");
            await updateMessageBlock(msgid, message);
        }

        message.extra.rpgs_data = structuredClone(chat_metadata[extensionName] || {});
    }

    async function updateStat(data) {
        const { category, action, id, name, value, hidden, message, effect, min, max, ivalue } = data;
        if (!category || !action) {
            log(`Invalid stat update data, missing category or action: ${JSON.stringify(data)}`);
            return;
        }

        const context = getContext();
        const characterId = context.characterId;

        if (!chat_metadata[extensionName]) chat_metadata[extensionName] = {};
        if (!chat_metadata[extensionName][characterId]) chat_metadata[extensionName][characterId] = {};

        const stats = chat_metadata[extensionName][characterId];
        let notification = message;

        switch (action) {
            case "stat":
                if (!id || name === undefined || value === undefined) {
                    log(`Invalid 'stat' action, missing id, name, or value: ${JSON.stringify(data)}`);
                    return;
                }
                if (!stats[category]) stats[category] = {};
                const oldStat = stats[category][id] || {};
                stats[category][id] = { ...oldStat, name: name ?? oldStat.name, value, effect: effect ?? oldStat.effect, min: +min || oldStat.min, max: +max || oldStat.max, ivalue: +ivalue, hidden: oldStat.hidden ?? hidden };
                if (!notification && rpgSettings.verboseStatChanges) {
                    if (oldStat) {
                        notification = `**${name}** in **${category}** updated to **${value}** (was ${oldStat.value}) (${effect})`;
                    } else {
                        notification = `New stat in **${category}**: **${name}** = **${value}** (${effect})`;
                    }
                }
                break;
            case "hide":
                if (!id) {
                    log(`Invalid 'hide' action, missing id: ${JSON.stringify(data)}`);
                    return;
                }
                if (stats[category]?.[id]) {
                    stats[category][id].hidden = true;
                    if (!notification && rpgSettings.verboseStatChanges) {
                        notification = `Stat **${stats[category][id].name}** in **${category}** is now hidden.`;
                    }
                }
                break;
            case "hidecat":
                if (!stats._hidden_categories) stats._hidden_categories = [];
                if (!stats._hidden_categories.includes(category)) stats._hidden_categories.push(category);
                if (!notification && rpgSettings.verboseStatChanges) {
                    notification = `Category **${category}** is now hidden.`;
                }
                break;
            case "show":
                if (!id) {
                    log(`Invalid 'show' action, missing id: ${JSON.stringify(data)}`);
                    return;
                }
                if (stats[category]?.[id]) {
                    stats[category][id].hidden = false;
                    if (!notification && rpgSettings.verboseStatChanges) {
                        notification = `Stat **${stats[category][id].name}** in **${category}** is now visible.`;
                    }
                }
                break;
            case "showcat":
                if (!stats._hidden_categories) {
                    stats._hidden_categories = [];
                }
                let index = stats._hidden_categories.indexOf(category);
                if (index !== -1) stats._hidden_categories.splice(index, 1);
                if (!notification && rpgSettings.verboseStatChanges) {
                    notification = `Category **${category}** is now visible.`;
                }
                break;
        }

        return notification;
    }

    $(document).ready(async function () {
        await loadRpgSettings();
        globalThis.rpgInterceptor = rpgInterceptor;

        eventSource.on(event_types.CHAT_CHANGED, renderStatBlock);
        eventSource.on(event_types.MESSAGE_RECEIVED, async (messageId) => {
            const context = getContext();
            const message = context.chat[messageId];
            if (message) {
                await handleMessage(message);
            }
        });
        eventSource.on(event_types.APP_READY, initializeStatTab);

        log("RPG extension loaded.");
    });
})();
