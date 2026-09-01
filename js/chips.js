let chipPageSeason =  null;
let chipPagePlayers = [];
let chipPageData = [];

// ==========================================
// STARTUP
// ==========================================

async function startupChips() {

    console.log("chips.js: startupChips Called");

    const loggedIn = await requireLogin();

    if (!loggedIn)
        return;

    setActiveNavigation("chips");
    setupLogout();

    try {
        // Get data from Supabase tables and populate the page
        chipPageSeason = await getActiveSeason();
        document.getElementById("chipSeasonName").textContent = chipPageSeason.name;
        chipPagePlayers = await getSeasonPlayers(chipPageSeason.id);
        chipPageData = await getSeasonChips(chipPageSeason.id);
        renderChipSummary();
        renderChipOverview();

        console.log("Chips page started successfully.");
    }
    catch(error) {
        console.error("Chips page startup failed:", error);
    }
}

// ==========================================
// GET CHIP DISPLAY NAME
// ==========================================

function getChipDisplayName(chip) {

    switch (chip) {
        case "WC":
            return "Wildcard";
        case "FH":
            return "Free Hit";
        case "BB":
            return "Bench Boost";
        case "TC":
            return "Triple Captain";
        default:
            return chip ?? "Unknown";
    }
}

// ==========================================
// RENDER CHIP SUMMARY
// ==========================================

function renderChipSummary() {

    console.log("chips.js: renderChipSummary Called");

    // ======================================
    // TOTAL CHIPS USED
    // ======================================

    const chipsUsed = chipPageData.length;
    const totalAvailableChips = chipPagePlayers.length * 8;
    document.getElementById("chipsUsedCount").textContent = `${chipsUsed} / ${totalAvailableChips}`;

    // ======================================
    // PLAYERS WHO HAVE USED A CHIP
    // ======================================

    const playerIds = new Set(chipPageData.map(chip => chip.player_id));

    document.getElementById("chipPlayersCount").textContent = `${playerIds.size} / ${chipPagePlayers.length}`;

    // ======================================
    // LATEST CHIP
    // ======================================

    const latestChipPlayerElement = document.getElementById("latestChipPlayer");
    const latestChipDetailsElement = document.getElementById("latestChipDetails");

    if (chipPageData.length === 0) {
        latestChipPlayerElement.textContent = "—";
        latestChipDetailsElement.textContent = "No chips used yet";
        return;
    }

    // ======================================
    // FIND LATEST CHIP BY GAMEWEEK
    // ======================================

    const latestGameweek = Math.max(...chipPageData.map(chip => chip.gameweek));
    const latestChips = chipPageData.filter(chip => chip.gameweek === latestGameweek);

    // ======================================
    // GET PLAYER NAMES
    // ======================================

    const latestNames = latestChips.map(chip =>
            {const player = chipPagePlayers.find(item => item.player_id === chip.player_id);
            return (player?.players?.name ?? `Player ${chip.player_id}`);
        }
    );

    latestChipPlayerElement.textContent = latestNames.join(" / ");

    // ======================================
    // DETAILS
    // ======================================

    const latestChipNames = [...new Set(latestChips.map(chip => getChipDisplayName(chip.chip)))];
    latestChipDetailsElement.textContent = `${latestChipNames.join(" / ")} · GW${latestGameweek}`;
}

// ==========================================
// RENDER CHIP OVERVIEW
// ==========================================

function renderChipOverview() {

    console.log("chips.js: renderChipOverview Called");

    const tbody = document.querySelector("#chipOverviewTable tbody");

    if (!tbody)
        return;

    tbody.innerHTML = "";

    chipPagePlayers.forEach(player => {
            const playerId = player.player_id;
            const playerName = player.players?.name ?? "Unknown";
            const chips = chipPageData.filter(row => row.player_id === playerId);
            const wildcard = getChipGameweek(chips, "WC");
            const freeHit = getChipGameweek(chips, "FH");
            const benchBoost = getChipGameweek(chips, "BB");
            const tripleCaptain = getChipGameweek(chips, "TC");

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <strong>
                        ${playerName}
                    </strong>
                </td>

                <td>
                    ${wildcard}
                </td>

                <td>
                    ${freeHit}
                </td>

                <td>
                    ${benchBoost}
                </td>

                <td>
                    ${tripleCaptain}
                </td>
            `;

            tbody.appendChild(row);
        }
    );
}

// ==========================================
// GET CHIP GAMEWEEK
// ==========================================

function getChipGameweek(chips, chipCode) {

    const matches = chips.filter(row => row.chip === chipCode).sort((a, b) =>
                    a.gameweek -
                    b.gameweek
            );

    const set1 = matches[0] ? `GW${matches[0].gameweek}`: "—";
    const set2 = matches[1] ? `GW${matches[1].gameweek}`: "—";

    return `
        <div class="chip-set">
            <span>
                Set 1
            </span>

            <strong>
                ${set1}
            </strong>
        </div>

        <div class="chip-set">
            <span>
                Set 2
            </span>

            <strong>
                ${set2}
            </strong>
        </div>
    `;
}

// ==========================================
// START
// ==========================================

startupChips();