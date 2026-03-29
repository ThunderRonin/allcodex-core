import { HiddenSubtreeAttribute, HiddenSubtreeItem } from "@triliumnext/commons";
import { t } from "i18next";

export default function buildHiddenSubtreeTemplates() {
    const hideSubtreeAttributes: HiddenSubtreeAttribute = {
        name: "subtreeHidden",
        type: "label"
    };

    const allcodexTemplates: HiddenSubtreeItem = {
        id: "_templates_lore",
        title: "Lore Templates",
        type: "book",
        children: [
            {
                id: "_template_character",
                type: "text",
                title: "Character",
                icon: "bx bx-user",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:fullName", type: "label", value: "promoted,alias=Full Name,single,text" },
                    { name: "label:aliases", type: "label", value: "promoted,alias=Aliases,single,text" },
                    { name: "label:age", type: "label", value: "promoted,alias=Age,single,number" },
                    { name: "label:race", type: "label", value: "promoted,alias=Race,single,text" },
                    { name: "label:gender", type: "label", value: "promoted,alias=Gender,single,text" },
                    { name: "label:affiliation", type: "label", value: "promoted,alias=Affiliation,single,text" },
                    { name: "label:role", type: "label", value: "promoted,alias=Role,single,text" },
                    { name: "label:status", type: "label", value: "promoted,alias=Status,single,text" },
                    { name: "label:secrets", type: "label", value: "promoted,alias=Secrets,single,text" },
                    { name: "label:goals", type: "label", value: "promoted,alias=Goals,single,text" }
                ]
            },
            {
                id: "_template_location",
                type: "text",
                title: "Location",
                icon: "bx bx-map-pin",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:locationType", type: "label", value: "promoted,alias=Type,single,text" },
                    { name: "label:region", type: "label", value: "promoted,alias=Region,single,text" },
                    { name: "label:population", type: "label", value: "promoted,alias=Population,single,number" },
                    { name: "label:ruler", type: "label", value: "promoted,alias=Ruler,single,text" },
                    { name: "label:secrets", type: "label", value: "promoted,alias=Secrets,single,text" },
                    { name: "label:geolocation", type: "label", value: "promoted,alias=Map Coords,single,text" }
                ]
            },
            {
                id: "_template_faction",
                type: "text",
                title: "Faction",
                icon: "bx bx-shield",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:factionType", type: "label", value: "promoted,alias=Type,single,text" },
                    { name: "label:foundingDate", type: "label", value: "promoted,alias=Founded,single,text" },
                    { name: "label:leader", type: "label", value: "promoted,alias=Leader,single,text" },
                    { name: "label:goals", type: "label", value: "promoted,alias=Goals,single,text" },
                    { name: "label:secrets", type: "label", value: "promoted,alias=Secrets,single,text" },
                    { name: "label:status", type: "label", value: "promoted,alias=Status,single,text" }
                ]
            },
            {
                id: "_template_creature",
                type: "text",
                title: "Creature",
                icon: "bx bx-bug",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:creatureType", type: "label", value: "promoted,alias=Type,single,text" },
                    { name: "label:habitat", type: "label", value: "promoted,alias=Habitat,single,text" },
                    { name: "label:diet", type: "label", value: "promoted,alias=Diet,single,text" },
                    { name: "label:dangerLevel", type: "label", value: "promoted,alias=Danger Level,single,number" },
                    { name: "label:abilities", type: "label", value: "promoted,alias=Abilities,single,text" }
                ]
            },
            {
                id: "_template_event",
                type: "text",
                title: "Event",
                icon: "bx bx-calendar-event",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:inWorldDate", type: "label", value: "promoted,alias=In-World Date,single,text" },
                    { name: "label:outcome", type: "label", value: "promoted,alias=Outcome,single,text" },
                    { name: "label:consequences", type: "label", value: "promoted,alias=Consequences,single,text" },
                    { name: "label:secrets", type: "label", value: "promoted,alias=Secrets,single,text" }
                ]
            },
            {
                id: "_template_timeline",
                type: "book",
                title: "Timeline",
                icon: "bx bx-time-five",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:calendarSystem", type: "label", value: "promoted,alias=Calendar System,single,text" },
                    { name: "sorted", type: "label" },
                    { name: "sortBy", type: "label", value: "inWorldDate" }
                ]
            },
            {
                id: "_template_manuscript",
                type: "text",
                title: "Manuscript",
                icon: "bx bx-book-open",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:genre", type: "label", value: "promoted,alias=Genre,single,text" },
                    { name: "label:manuscriptStatus", type: "label", value: "promoted,alias=Status,single,text" },
                    { name: "label:wordCount", type: "label", value: "promoted,alias=Word Count,single,number" }
                ]
            },
            {
                id: "_template_statblock",
                type: "text",
                title: "Statblock",
                icon: "bx bx-list-check",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:crName", type: "label", value: "promoted,alias=Name,single,text" },
                    { name: "label:crLevel", type: "label", value: "promoted,alias=CR,single,number" },
                    { name: "label:ac", type: "label", value: "promoted,alias=AC,single,number" },
                    { name: "label:hp", type: "label", value: "promoted,alias=HP,single,number" },
                    { name: "label:str", type: "label", value: "promoted,alias=STR,single,number" },
                    { name: "label:dex", type: "label", value: "promoted,alias=DEX,single,number" },
                    { name: "label:con", type: "label", value: "promoted,alias=CON,single,number" },
                    { name: "label:int", type: "label", value: "promoted,alias=INT,single,number" },
                    { name: "label:wis", type: "label", value: "promoted,alias=WIS,single,number" },
                    { name: "label:cha", type: "label", value: "promoted,alias=CHA,single,number" },
                    { name: "label:abilities", type: "label", value: "promoted,alias=Special Abilities,single,text" }
                ]
            },
            {
                id: "_template_item",
                type: "text",
                title: "Item / Artifact",
                icon: "bx bx-diamond",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:itemType", type: "label", value: "promoted,alias=Item Type,single,text" },
                    { name: "label:rarity", type: "label", value: "promoted,alias=Rarity,single,text" },
                    { name: "label:creator", type: "label", value: "promoted,alias=Creator,single,text" },
                    { name: "label:magicProperties", type: "label", value: "promoted,alias=Magic Properties,single,text" },
                    { name: "label:history", type: "label", value: "promoted,alias=History,single,text" }
                ]
            },
            {
                id: "_template_spell",
                type: "text",
                title: "Spell / Magic",
                icon: "bx bx-meteor",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:school", type: "label", value: "promoted,alias=School,single,text" },
                    { name: "label:level", type: "label", value: "promoted,alias=Level,single,text" },
                    { name: "label:castingTime", type: "label", value: "promoted,alias=Casting Time,single,text" },
                    { name: "label:range", type: "label", value: "promoted,alias=Range,single,text" },
                    { name: "label:components", type: "label", value: "promoted,alias=Components,single,text" },
                    { name: "label:duration", type: "label", value: "promoted,alias=Duration,single,text" }
                ]
            },
            {
                id: "_template_building",
                type: "text",
                title: "Building / Structure",
                icon: "bx bx-building-house",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:buildingType", type: "label", value: "promoted,alias=Type,single,text" },
                    { name: "label:owner", type: "label", value: "promoted,alias=Owner,single,text" },
                    { name: "label:purpose", type: "label", value: "promoted,alias=Purpose,single,text" },
                    { name: "label:condition", type: "label", value: "promoted,alias=Condition,single,text" },
                    { name: "label:secrets", type: "label", value: "promoted,alias=Secrets,single,text" }
                ]
            },
            {
                id: "_template_language",
                type: "text",
                title: "Language / Script",
                icon: "bx bx-font-family",
                attributes: [
                    { name: "template", type: "label" },
                    { name: "label:languageFamily", type: "label", value: "promoted,alias=Language Family,single,text" },
                    { name: "label:speakers", type: "label", value: "promoted,alias=Speakers,single,text" },
                    { name: "label:script", type: "label", value: "promoted,alias=Script,single,text" },
                    { name: "label:samplePhrase", type: "label", value: "promoted,alias=Sample Phrase,single,text" }
                ]
            }
        ]
    };

    const templates: HiddenSubtreeItem = {
        id: "_templates",
        title: t("hidden_subtree_templates.built-in-templates"),
        type: "book",
        children: [
            {
                id: "_template_text_snippet",
                type: "text",
                title: t("hidden_subtree_templates.text-snippet"),
                icon: "bx-align-left",
                attributes: [
                    {
                        name: "template",
                        type: "label"
                    },
                    {
                        name: "textSnippet",
                        type: "label"
                    },
                    {
                        name: "label:textSnippetDescription",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.description")},single,text`
                    }
                ]
            },
            {
                id: "_template_list_view",
                type: "book",
                title: t("hidden_subtree_templates.list-view"),
                icon: "bx bx-list-ul",
                attributes: [
                    {
                        name: "template",
                        type: "label"
                    },
                    {
                        name: "collection",
                        type: "label"
                    },
                    {
                        name: "viewType",
                        type: "label",
                        value: "list"
                    }
                ]
            },
            {
                id: "_template_grid_view",
                type: "book",
                title: t("hidden_subtree_templates.grid-view"),
                icon: "bx bxs-grid",
                attributes: [
                    {
                        name: "template",
                        type: "label"
                    },
                    {
                        name: "collection",
                        type: "label"
                    },
                    {
                        name: "viewType",
                        type: "label",
                        value: "grid"
                    }
                ]
            },
            {
                id: "_template_calendar",
                type: "book",
                title: t("hidden_subtree_templates.calendar"),
                icon: "bx bx-calendar",
                attributes: [
                    {
                        name: "template",
                        type: "label",
                    },
                    {
                        name: "collection",
                        type: "label"
                    },
                    {
                        name: "viewType",
                        type: "label",
                        value: "calendar"
                    },
                    {
                        name: "hidePromotedAttributes",
                        type: "label"
                    },
                    hideSubtreeAttributes,
                    {
                        name: "label:startDate",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.start-date")},single,date`,
                        isInheritable: true
                    },
                    {
                        name: "label:endDate",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.end-date")},single,date`,
                        isInheritable: true
                    },
                    {
                        name: "label:startTime",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.start-time")},single,time`,
                        isInheritable: true
                    },
                    {
                        name: "label:endTime",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.end-time")},single,time`,
                        isInheritable: true
                    }
                ]
            },
            {
                id: "_template_table",
                type: "book",
                title: t("hidden_subtree_templates.table"),
                icon: "bx bx-table",
                attributes: [
                    {
                        name: "template",
                        type: "label"
                    },
                    {
                        name: "collection",
                        type: "label"
                    },
                    hideSubtreeAttributes,
                    {
                        name: "viewType",
                        type: "label",
                        value: "table"
                    }
                ]
            },
            {
                id: "_template_geo_map",
                type: "book",
                title: t("hidden_subtree_templates.geo-map"),
                icon: "bx bx-map-alt",
                attributes: [
                    {
                        name: "template",
                        type: "label"
                    },
                    {
                        name: "collection",
                        type: "label"
                    },
                    {
                        name: "viewType",
                        type: "label",
                        value: "geoMap"
                    },
                    {
                        name: "hidePromotedAttributes",
                        type: "label"
                    },
                    hideSubtreeAttributes,
                    {
                        name: "label:geolocation",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.geolocation")},single,text`,
                        isInheritable: true
                    }
                ]
            },
            {
                id: "_template_board",
                type: "book",
                title: t("hidden_subtree_templates.board"),
                icon: "bx bx-columns",
                attributes: [
                    {
                        name: "template",
                        type: "label"
                    },
                    {
                        name: "collection",
                        type: "label"
                    },
                    {
                        name: "viewType",
                        type: "label",
                        value: "board"
                    },
                    {
                        name: "hidePromotedAttributes",
                        type: "label"
                    },
                    hideSubtreeAttributes,
                    {
                        name: "label:status",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.status")},single,text`,
                        isInheritable: true
                    }
                ],
                children: [
                    {
                        id: "_template_board_first",
                        title: t("hidden_subtree_templates.board_note_first"),
                        attributes: [{
                            name: "status",
                            value: t("hidden_subtree_templates.board_status_todo"),
                            type: "label"
                        }],
                        type: "text"
                    },
                    {
                        id: "_template_board_second",
                        title: t("hidden_subtree_templates.board_note_second"),
                        attributes: [{
                            name: "status",
                            value: t("hidden_subtree_templates.board_status_progress"),
                            type: "label"
                        }],
                        type: "text"
                    },
                    {
                        id: "_template_board_third",
                        title: t("hidden_subtree_templates.board_note_third"),
                        attributes: [{
                            name: "status",
                            value: t("hidden_subtree_templates.board_status_done"),
                            type: "label"
                        }],
                        type: "text"
                    }
                ]
            },
            {
                id: "_template_presentation_slide",
                type: "text",
                title: t("hidden_subtree_templates.presentation_slide"),
                icon: "bx bx-rectangle",
                attributes: [
                    {
                        name: "slide",
                        type: "label"
                    },
                    {
                        name: "label:slide:background",
                        type: "label",
                        value: `promoted,alias=${t("hidden_subtree_templates.background")},single,color`
                    }
                ]
            },
            {
                id: "_template_presentation",
                type: "book",
                title: t("hidden_subtree_templates.presentation"),
                icon: "bx bx-slideshow",
                attributes: [
                    {
                        name: "template",
                        type: "label"
                    },
                    {
                        name: "viewType",
                        type: "label",
                        value: "presentation"
                    },
                    {
                        name: "collection",
                        type: "label"
                    },
                    {
                        name: "child:template",
                        type: "relation",
                        value: "_template_presentation_slide"
                    }
                ],
                children: [
                    {
                        id: "_template_presentation_first",
                        type: "text",
                        title: t("hidden_subtree_templates.presentation_slide_first"),
                        content: t("hidden_subtree_templates.presentation_slide_first"),
                        attributes: [
                            {
                                name: "template",
                                type: "relation",
                                value: "_template_presentation_slide"
                            }
                        ]
                    },
                    {
                        id: "_template_presentation_second",
                        type: "text",
                        title: t("hidden_subtree_templates.presentation_slide_second"),
                        content: t("hidden_subtree_templates.presentation_slide_second"),
                        attributes: [
                            {
                                name: "template",
                                type: "relation",
                                value: "_template_presentation_slide"
                            }
                        ]
                    }
                ]
            }
        ]
    };

    return {
        ...templates,
        children: [...(templates.children ?? []), allcodexTemplates]
    } as HiddenSubtreeItem;
}
