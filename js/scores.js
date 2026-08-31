
let scorePageSeason = null;
let scorePagePlayers = [];
let fplPlayerLookup = {};
let currentGameweek = 0;
let currentSeasonId = 0;
let selectedGameweek = 0;

// ==========================================
// STARTUP
// ==========================================

async function startupScores() {

    debugLog("scores.js: startupScores Called");

    const loggedIn = await requireAdminLogin();

    if (!loggedIn)
        return;

    setActiveAdminNavigation("scores");
    setupAdminLogout();

    try {
        scorePageSeason = await getAdminActiveSeason();
        currentGameweek = Number(scorePageSeason.currentGameweek)
        currentSeasonId = scorePageSeason.id
        scorePagePlayers = await getAdminSeasonPlayers(currentSeasonId);

        populateGameweekSelector(scorePageSeason);
        renderImportTimestamps(scorePageSeason);
        await loadScores(scorePageSeason.currentGameweek);

        document.getElementById("scoreSeasonName").textContent = scorePageSeason.name;

        document.getElementById("gameweekSelector").addEventListener("change", event => {loadScores(Number(event.target.value));});
        document.getElementById("importFplButton").addEventListener("click", handleFplImport);
        document.getElementById("importCaptainDataButton").addEventListener("click", handleCaptainImport);

        debugLog("Scores page started successfully.");
    }
    catch(error) {
        console.error("Scores page startup failed:", error);
    }
}

// ==========================================
// GAMEWEEK SELECTOR
// ==========================================

function populateGameweekSelector(season) {

    debugLog("scores.js: populateGameweekSelector Called");

    const selector = document.getElementById("gameweekSelector");

    selector.innerHTML = "";

    for (let gw = 1; gw <= season.totalGameweeks; gw++) {

        const option = document.createElement("option");

        option.value = gw;
        option.textContent = `GW${gw}`;

        if (gw === season.currentGameweek) {
            option.selected = true;
        }

        selector.appendChild(option);
    }
}

// ==========================================
// LOAD SELECTED GAMEWEEK SCORES
// ==========================================

async function loadScores(gameweek) {

    console.clear();
    debugLog("scores.js: loadScores Called");

    selectedGameweek = gameweek;

    try {
        const scoreData = await getAdminGameweekScores(currentSeasonId, gameweek);

        renderScores(scorePagePlayers, scoreData, gameweek);
        await updateDataPanels(currentSeasonId, gameweek, scoreData);
    }
    catch(error) {console.error("Unable to load scores:", error);
    }

    document.getElementById("importCaptainDataButton").textContent = `Update Captains for GW${selectedGameweek}`;
}

// ==========================================
// RENDER SCORES TABLE
// ==========================================

function renderScores(seasonPlayers, scoreData, gameweek) {

    debugLog("scores.js: renderScores Called");
    debugLogArgs("GAMEWEEK: ", gameweek);
    debugLogArgs("SEASON PLAYERS: ", seasonPlayers);
    debugLogArgs("SCORE DATA: ", scoreData);

    const tbody = document.querySelector("#scoreManagementTable tbody");

    tbody.innerHTML = "";

    seasonPlayers.forEach(player => {const score = scoreData.find(row => row.player_id === player.player_id);

            const fplPoints = Number(score?.fpl_points) || 0;
            const adjustment = Number(score?.adjustment) || 0;
            const total = fplPoints + adjustment;
            const row = document.createElement("tr");

            if (adjustment !== 0) {
                row.classList.add("score-adjusted-row");
            }

            row.innerHTML = `
                <td>
                    <strong>
                        ${player.players?.name ?? "Unknown"}
                    </strong>
                </td>

                <td class="score-fpl">
                    ${fplPoints}
                </td>

                <td>
                    <input
                        type="number"
                        class="score-adjustment"
                        data-player-id="${player.player_id}"
                        value="${adjustment}"
                    >
                </td>

                <td class="score-total">
                    ${total}
                </td>

                <td>
                    <input
                        type="text"
                        class="score-note"
                        data-player-id="${player.player_id}"
                        value="${score?.note ?? ""}"
                        placeholder="Optional note"
                    >
                </td>

                <td>
                    <button
                        class="save-score-button"
                        data-player-id="${player.player_id}"
                        data-gameweek="${gameweek}"
                    >
                        Save
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        }
    );

    document.querySelectorAll(".save-score-button").forEach(button => {
                button.addEventListener("click", () => {saveScore(Number(button.dataset.playerId), Number(button.dataset.gameweek));});
            }
        );
}

// ==========================================
// UPDATE DATA PANELS
// ==========================================

async function updateDataPanels(seasonId, gameweek, scores) {

    debugLog("scores.js: updateDataPanels Called");

    chips = await getGameweekChips(seasonId, gameweek);    

    const totalPlayers = scorePagePlayers.length;
    const scoreCount =  scores.filter(score => score.fpl_points !== null).length;
    const captainPlayerIds = new Set(scores.filter(score => score.captain_name && score.captain_multiplier !== null).map(score => score.player_id));
    const captainCount = captainPlayerIds.size;
    const chipCount = chips.length;
    const missingCaptainPlayers = scorePagePlayers.filter(player => !captainPlayerIds.has(player.player_id));
    const missingCaptainNames = missingCaptainPlayers.map(player => player.players?.name ?? `Player ${player.player_id}`);

    document.getElementById("gameweekScoreStatus").textContent = `${scoreCount} / ${totalPlayers} ${scoreCount === totalPlayers ? "✓" : "⚠"}`;

    const captainStatusElement = document.getElementById("gameweekCaptainStatus");
    const captainMissingElement = document.getElementById("gameweekCaptainMissing");

    captainStatusElement.textContent = `${captainCount} / ${totalPlayers} ${captainCount === totalPlayers ? "✓" : "⚠"}`;

    if (missingCaptainNames.length > 0) {
        captainMissingElement.textContent = `Missing: ${missingCaptainNames.join(", ")}`;
    }
    else {
        captainMissingElement.textContent = "";
    }

    document.getElementById("gameweekChipStatus").textContent = chipCount;
}

// ==========================================
// SAVE MODIFIED SCORE
// ==========================================

async function saveScore(playerId, gameweek) {

    debugLog("scores.js: saveScore Called");
    debugLogArgs("PLAYER ID: ", playerId);
    debugLogArgs("GAMEWEEK: ", gameweek);

    const adjustmentInput = document.querySelector(`.score-adjustment[data-player-id="${playerId}"]`);
    const noteInput = document.querySelector(`.score-note[data-player-id="${playerId}"]`);

    if (!adjustmentInput || !noteInput) {
        console.error("Score inputs not found for player:", playerId);
        return;
    }

    const adjustment = Number(adjustmentInput.value) || 0;
    const note = noteInput.value.trim();

    try {
        await saveAdminGameweekScore(currentSeasonId, playerId, gameweek, adjustment, note || null);

        console.log("Score saved successfully.");

        await loadScores(gameweek);
    }
    catch(error) {
        console.error("Unable to save score:", error);
        alert("Unable to save score.");
    }
}

// ==========================================
// IMPORT SCORES
// ==========================================

async function handleFplImport() {

    console.clear();
    debugLog("scores.js: handleFplImport Called");

    const button = document.getElementById("importFplButton");

    button.disabled = true;

    button.innerHTML = `
        <span
            class="fpl-spinner"
        ></span>
        Importing...
    `;

    showImportStatus();

    document.getElementById("fplImportStatusTitle").textContent = "FPL Score Import";

    try {
        const result = await importAllFplPlayers();

        if (!result)
            return;

        if (result.gameweekError) {
            updateImportSummary("Import stopped — no active FPL gameweek.");
            return;
        }

        updateImportSummary(
            `Import complete — ` +
            `Imported: ${result.imported}, ` +
            `Skipped: ${result.skipped}, ` +
            `Failed: ${result.failed}`
        );

        // ==========================================
        // PLAYER IMPORT SUCCESS
        // ==========================================

        const gameweek = Number(document.getElementById("gameweekSelector").value);

        await loadScores(gameweek);

        const scoreImportTime = new Date().toISOString();

        /*const {error: timestampError} =
            await supabaseClient
                .from("seasons")
                .update({scores_last_imported_at: scoreImportTime})
                .eq("id", scorePageSeason.id);
        if (timestampError)
            throw timestampError;*/

        await updateScoresTimestamp(scoreImportTime, currentSeasonId);
        scorePageSeason.scores_last_imported_at = scoreImportTime;
        renderImportTimestamps(scorePageSeason);
    }
    catch(error) {

        console.error("FPL import error:", error);
        updateImportSummary("FPL import failed.");
    }
    finally {
        button.disabled = false;
        button.textContent = "Import Season Scores";
    }
}

async function importAllFplPlayers() {

    debugLog("scores.js: importAllFplPlayers Called");

    debugLogPlayerImport("=====================================");
    debugLogPlayerImport("Starting Score import for all players");
    debugLogPlayerImport("=====================================");

    try {
        showImportStatus();
        updateImportSummary("Checking current FPL gameweek...");

        const gameweekValid = await checkValidGameweek();
            
        if (!gameweekValid) {
            updateImportSummary("Import stopped — no active FPL gameweek.");
            return {
                imported: 0,
                skipped: 0,
                failed: 0,
                failedPlayers: [],
                gameweekError: true
            };
        }

        updateImportSummary("Current gameweek confirmed. Starting player import...");
        debugLogPlayerImport("Gameweek check complete:", gameweekValid);

        // ==========================================
        // GET ACTIVE SEASON
        // ==========================================

        /*const {data: season, error: seasonError} =
            await supabaseClient
                .from("seasons")
                .select("*")
                .eq(
                    "active",
                    true
                )
                .single();


        if (seasonError)
            throw seasonError;*/


        // ==========================================
        // GET ACTIVE PLAYERS
        // ==========================================

        /*const {
            data: seasonPlayers,
            error: playersError
        } =
            await supabaseClient
                .from("season_players")
                .select(`
                    id,
                    player_id,
                    fpl_entry_id,
                    players (
                        id,
                        name
                    )
                `)
                .eq(
                    "season_id",
                    season.id
                )
                .eq(
                    "active",
                    true
                )
                .order(
                    "display_order"
                );


        if (playersError)
            throw playersError;*/

        // ==========================================
        // LOAD FPL PLAYER LOOKUP
        // ==========================================

        /*const fplPlayerLookup =
            await getFplPlayerLookup();*/


        // ==========================================
        // GAMEWEEK LIVE DATA CACHE
        // ==========================================

        //const gameweekLiveCache =
        //    {};


        // ==========================================
        // COUNTERS
        // ==========================================

        let imported = 0;
        let skipped = 0;
        const failedPlayers = [];

        // ==========================================
        // FIRST PASS
        // ==========================================
        
        debugLogPlayerImport("Starting first import pass...");

        for (const player of scorePagePlayers) {

            const playerName = player.players?.name ?? `Player ${player.player_id}`;

            // --------------------------------------
            // NO FPL ENTRY ID
            // --------------------------------------

            if (!player.fpl_entry_id) {
                updateImportStatus(player.player_id, playerName, "skipped", "No FPL Entry ID");
                skipped++;
                continue;
            }

            updateImportStatus(player.player_id, playerName, "importing", "Importing...");

            try {
                const success = await importFplPlayer(currentSeasonId, player.player_id, player.fpl_entry_id, playerName);

                if (success) {
                    imported++;
                    updateImportStatus(player.player_id, playerName, "success", "Imported");
                }
                else {
                    skipped++;
                    updateImportStatus(player.player_id, playerName, "skipped", "No completed gameweek data");
                }
            }            
            catch(error)            
             {
                console.warn(`First pass failed for ${playerName}`);
                updateImportStatus(player.player_id, playerName, "retry", "First pass failed — queued for retry");
                failedPlayers.push({playerId: player.player_id, playerName: playerName, entryId: player.fpl_entry_id, error: error});
            }

            // ======================================
            // DELAY BEFORE NEXT PLAYER
            // ======================================

           updateImportSummary(`Retrying ${failedPlayers.length} failed player(s)...`);

            const playerDelay = 3000 + Math.floor(Math.random() * 2000);

            await new Promise(resolve => setTimeout(resolve, playerDelay));
        }

        // ==========================================
        // SECOND PASS
        // ==========================================

        const finalFailures = [];

        if (failedPlayers.length > 0) {
            debugLogPlayerImport("=====================================");
            debugLogPlayerImport(`First pass completed with ${failedPlayers.length} failures`);
            debugLogPlayerImport("Waiting before second pass...");
            debugLogPlayerImport("=====================================");

            updateImportSummary(`Retrying ${failedPlayers.length} failed player(s)...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            debugLogPlayerImport("Starting second import pass...");

            for (const player of failedPlayers) {

                updateImportStatus(player.playerId, playerName, "retry", "Retrying...");

                try {
                    const success = await importFplPlayer(currentSeasonId, player.player_id, player.fpl_entry_id, playerName);

                    if (success) {
                        imported++;
                        updateImportStatus(player.playerId, playerName, "success", "Imported on retry");
                    }
                    else {
                        skipped++;
                    }
                }
                catch(error) {
                    console.error(`Second-pass import failed: ${playerName}`, error);
                    updateImportStatus(player.playerId, playerName, "failed", "Import failed");
                    finalFailures.push({playerId: player.playerId, playerName: playerName, entryId: player.entryId, error: error});
                }

                const retryDelay = 2500 + Math.floor(Math.random() * 2500);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        // ==========================================
        // FINAL SUMMARY
        // ==========================================

        debugLogPlayerImport("=================================");
        debugLogPlayerImport("FPL IMPORT COMPLETE");
        debugLogPlayerImport("=================================");
        debugLogPlayerImport("Imported:", imported,);
        debugLogPlayerImport("Skipped:", skipped);
        debugLogPlayerImport("Failed:", finalFailures.length);

        if (finalFailures.length > 0) {
            debugLogPlayerImport( "Final failed players:");
            finalFailures.forEach(player => {debugLogPlayerImport(`${player.playerName} (${player.entryId})`);});
        }

        updateImportSummary(`Import complete — Imported: ${imported}, Skipped: ${skipped}, Failed: ${finalFailures.length}`);

        return {
            imported: imported,
            skipped: skipped,
            failed: finalFailures.length,
            failedPlayers: finalFailures
        };
    }
    catch(error) {
        console.error("FPL import failed:", error);
        return null;
    }
}

async function importFplPlayer(seasonId, playerId, entryId, playerName) {

    debugLog("scores.js: importFplPlayer Called");
    debugLog("Importing FPL player:");
    debugLogPlayerImport("Player ID:", playerId, entryId, playerName);

    try {
        // ==========================================
        // GET FPL HISTORY
        // ==========================================

        let data = null;
        let lastError = null;

        for (let attempt = 1; attempt <= 5; attempt++) {

            try {
                debugLogPlayerImport(`FPL request attempt ${attempt} for ${entryId} ${playerName}`);

                const result = await supabaseClient.functions.invoke("fpl-history", {body: {entryId: entryId}});

                if (result.error) {
                    if (result.error.context) {
                        try {
                            const errorBody = await result.error.context
                                .clone()
                                .json();

                            console.warn("Edge Function response body:", errorBody);
                        }
                        catch {
                            // Ignore response parsing errors
                        }
                    }
                    throw result.error;
                }

                data = result.data;

                debugLogPlayerImport(`FPL request succeeded for ${entryId} on attempt ${attempt}`);
                debugLogPlayerImport("DATA:", data);
                break;
            }
            catch (error) {
                lastError = error;

                console.warn(
                    `FPL request failed for ${entryId}, attempt ${attempt}`,
                    error
                );

                if (attempt < 5) {
                    const delay = 2000 * Math.pow(2, attempt - 1);
                    const jitter = Math.floor(Math.random() * 1000);
                    const waitTime = delay + jitter;

                    debugLogPlayerImport(`Waiting ${waitTime} ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        if (!data) {
            throw (lastError ?? new Error("FPL request failed after retries"));
        }

        debugLogPlayerImport("FPL history received for:", playerName, data);

        // ==========================================
        // GET CURRENT SEASON HISTORY
        // ==========================================

        const history = data.current;

        if (!Array.isArray(history) || history.length === 0) {
            debugLogPlayerImport("No completed FPL gameweeks for", playerName);
            return false;
        }

        debugLogPlayerImport("Current season gameweeks:", history.length);

        // ==========================================
        // LOAD EXISTING SCORES
        // ==========================================

        const {data: existingScores, error: existingError} =
            await supabaseClient
                .from("gameweek_scores")
                .select("gameweek, adjustment, note")
                .eq("season_id", seasonId)
                .eq("player_id", playerId);

        if (existingError)
            throw existingError;

        // ==========================================
        // BUILD EXISTING SCORE LOOKUP
        // ==========================================

        const existingScoreLookup = {};

        existingScores.forEach(score => {
            existingScoreLookup[score.gameweek] = score;
        });

        // ==========================================
        // BUILD SCORE ROWS
        // ==========================================

        const scoreRows = [];

        for (const gw of history) {
            debugLogPlayerImport("Importing GW", gw.event, "points:", gw.points);

            const existing = existingScoreLookup[gw.event];

            scoreRows.push({
                season_id: seasonId,
                player_id: playerId,
                gameweek: gw.event,
                fpl_points: gw.points,
                adjustment: existing?.adjustment ?? 0,
                note: existing?.note ?? null
            });
        }

        // ==========================================
        // UPSERT SCORES
        // ==========================================

        if (scoreRows.length > 0) {
            const {error: upsertError} = await supabaseClient
                .from("gameweek_scores")
                .upsert(scoreRows, {onConflict: "season_id,player_id,gameweek"});
            if (upsertError)
                throw upsertError;
        }

        debugLogPlayerImport("FPL import complete for:", playerName);
        return true;
    }
    catch (error) {
        console.error("FPL import failed:", error);
        throw error;
    }
}

// ==========================================
// IMPORT CAPTAINS
// ==========================================

async function handleCaptainImport() {

    console.clear();
    debugLog("scores.js: handleCaptainImport Called");

    const button = document.getElementById("importCaptainDataButton");

    button.disabled = true;

    button.innerHTML = `
        <span
            class="fpl-spinner"
        ></span>

        Updating...
    `;

    showImportStatus();

    const statusTitle = document.getElementById("fplImportStatusTitle");

    if (statusTitle) {
        statusTitle.textContent =`Captain Import for GW${selectedGameweek}`;
    }

    try {
        await importCaptainData(currentSeasonId, scorePagePlayers);
    }
    catch(error) {
        console.error("Captain import error:", error);
        updateImportSummary("Captain import failed.");
    }
    finally {
        button.disabled = false;
        button.textContent = `Update Captains for GW${selectedGameweek}`;
    }
}

async function importCaptainData(seasonId, seasonPlayers) {

    debugLog("scores.js: importCaptainData Called");

    debugLogPlayerImport("=======================================");
    debugLogPlayerImport("Starting Captain import for all players");
    debugLogPlayerImport("=======================================");

    const statusTitle = document.getElementById("fplImportStatusTitle");

    if (statusTitle) {
        statusTitle.textContent = `Captain Import for GW${selectedGameweek}`;
    }

    updateImportSummary("Preparing captain import...");

    try {
        // ==========================================
        // GET ACTIVE SEASON
        // ==========================================

        /*const {
            data: season,
            error: seasonError
        } =
            await supabaseClient
                .from(
                    "seasons"
                )
                .select("*")
                .eq(
                    "active",
                    true
                )
                .single();


        if (seasonError)
            throw seasonError;


        // ==========================================
        // GET ACTIVE PLAYERS
        // ==========================================

        const {
            data: seasonPlayers,
            error: playersError
        } =
            await supabaseClient
                .from(
                    "season_players"
                )
                .select(`
                    player_id,
                    fpl_entry_id,
                    players (
                        name
                    )
                `)
                .eq(
                    "season_id",
                    season.id
                )
                .eq(
                    "active",
                    true
                );


        if (playersError)
            throw playersError;*/


        // ==========================================
        // GET SCORE ROWS
        // ==========================================

        const {data: scoreRows, error: scoreError} =
            await supabaseClient
                .from("gameweek_scores")
                .select(`
                    id,
                    player_id,
                    gameweek,
                    captain_name,
                    captain_points,
                    captain_multiplier
                `)
                .eq("season_id", seasonId);
            if (scoreError)
                throw scoreError;

        // ==========================================
        // GET EXISTING CHIP DATA
        // ==========================================

        const {data: chipRows, error: chipError} =
            await supabaseClient
                .from("player_chips")
                .select(`
                    id,
                    player_id,
                    gameweek,
                    chip
                `)
                .eq("season_id", seasonId);
            if (chipError)
                throw chipError;

        // ============================================
        // GET ACTUAL PLAYER NAME FROM THE FPL WEBSITE
        // ============================================
        //
        // Captain names come from bootstrap-static.
        // Do NOT continue if this lookup fails.
        // ============================================

        const fplPlayerNamesLookup = {};
        let lookupLoaded = false;
        const lookupAttempts = 3;

        for (let attempt = 1; attempt <= lookupAttempts; attempt++) {
            try {
                updateImportSummary(`Loading FPL player information — attempt ${attempt}...`);

                const lookupResult = await supabaseClient.functions.invoke("fpl-history", {body: {requestType: "currentGameweek"}});

                if (lookupResult.error) {
                    if (lookupResult.error.context) {
                        try {
                            const errorBody = await lookupResult.error.context
                                    .clone()
                                    .json();
                            console.warn("Player lookup Edge Function response:", errorBody);
                        }
                        catch {
                            // Ignore response parsing errors
                        }
                    }
                    throw lookupResult.error;
                }
                
                const fplPlayerNames = lookupResult.data?.players ?? [];

                if (
                    !Array.isArray(fplPlayerNames) || fplPlayerNames.length === 0) {
                    throw new Error(
                        "FPL player lookup returned no players"
                    );
                }

                fplPlayerNames.forEach(player => {fplPlayerNamesLookup[Number(player.id)] = {id: Number(player.id), name: player.web_name};});
                lookupLoaded = true;
                console.log("FPL player names loaded:", Object.keys(fplPlayerNamesLookup).length);
                break;
            }
            catch(error) {
                console.warn(`FPL player lookup failed on attempt ${attempt}:`, error);

                if (attempt < lookupAttempts) {
                    updateImportSummary(`FPL player lookup failed — retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }

        // ==========================================
        // LOOKUP IS REQUIRED
        // ==========================================

        if (!lookupLoaded) {
            throw new Error("Unable to load FPL player names. Captain import stopped.");
        }

        // ==========================================
        // LIVE GAMEWEEK DATA CACHE
        // ==========================================

        const gameweekLiveCache = {};

        // ==========================================
        // BUILD CAPTAIN IMPORT JOBS
        // ==========================================

        let pendingJobs = [];
        let initiallySkipped = 0;
        //const selectedGameweek = Number(document.getElementById("gameweekSelector").value);

        seasonPlayers.forEach(player => {
                const playerName = player.players?.name ?? `Player ${player.player_id}`;

                if (!player.fpl_entry_id) {
                    initiallySkipped++;
                    updateImportStatus(player.player_id, playerName, "skipped", "No FPL Entry ID");
                    return;
                }

                const playerRows = scoreRows.filter(row => row.player_id === player.player_id && row.gameweek === selectedGameweek);

                playerRows.forEach(row => {
                        //const captainAlreadyImported = Boolean(row.captain_name && row.captain_multiplier);

                        //if (captainAlreadyImported) {
                        //    initiallySkipped++;
                        //    updateImportStatus(player.player_id, playerName, "skipped", `GW${row.gameweek} already imported`);
                        //    return;
                        //}

                        // ==================================
                        // ADD IMPORT JOB
                        // ==================================

                        pendingJobs.push({
                            rowId: row.id,
                            playerId: player.player_id,
                            entryId:  player.fpl_entry_id,
                            playerName: playerName,
                            gameweek: row.gameweek
                        });
                    }
                );
            }
        );

        if (pendingJobs.length === 0 ) {
            updateImportSummary(`Captain import complete — no captain data for Gameweek ${selectedGameweek}.`);
            return;
        }

        let imported = 0;
        const maxPasses = 3;

        for (let pass = 1; pass <= maxPasses; pass++) {
            if (pendingJobs.length === 0) {
                break;
            }

            updateImportSummary(`Captain import pass ${pass} — ${pendingJobs.length} remaining`);

            debugLogPlayerImport("=================================");
            debugLogPlayerImport(`CAPTAIN IMPORT PASS ${pass}`);
            debugLogPlayerImport(`Pending: ${pendingJobs.length}`);
            debugLogPlayerImport("=================================");

            // ======================================
            // RANDOMISE RETRY ORDER
            // ======================================

            pendingJobs = [...pendingJobs].sort( () => Math.random() - 0.5);

            const failedJobs = [];

            // ======================================
            // PROCESS THIS PASS
            // ======================================

            for (const job of pendingJobs) {
                updateImportStatus(job.playerId, job.playerName, "importing", `GW${job.gameweek} captain — pass ${pass}`);

                try {
                    const captainResult = await supabaseClient.functions.invoke("fpl-history", {body: {requestType: "captainPick", entryId: job.entryId, gameweek: job.gameweek}});

                    if (captainResult.error) {
                        if (captainResult.error.context) {
                            try {
                                const errorBody = await captainResult.error.context
                                        .clone()
                                        .json();

                                console.warn(`Captain response for ${job.playerName} GW${job.gameweek}:`, errorBody);
                            }
                            catch {
                                // Ignore response parsing errors
                            }
                        }
                        throw captainResult.error;
                    }

                    const captainData = captainResult.data;

                    // ==================================
                    // CHIP
                    // ==================================

                    const activeChip = captainData.activeChip ?? null;
                    const chip = mapFplChip(activeChip);

                    // ==================================
                    // CAPTAIN ID / MULTIPLIER
                    // ==================================

                    const captainElementId = Number(captainData.elementId);
                    const captainMultiplier = Number(captainData.multiplier);

                    if (!Number.isInteger(captainElementId) || captainElementId <= 0) {
                        throw new Error(`Invalid captain element ID for ${job.playerName}`);
                    }

                    // ==================================
                    // CAPTAIN NAME
                    // ==================================

                    const captainPlayer = fplPlayerNamesLookup[captainElementId];

                    if (!captainPlayer || !captainPlayer.name) {
                        throw new Error(`Unable to resolve captain element ${captainElementId} for ${job.playerName}`);
                    }

                    const captainName = captainPlayer.name;

                    // ==================================
                    // GET / CACHE LIVE GAMEWEEK DATA
                    // ==================================

                    let liveData = gameweekLiveCache[job.gameweek];

                    if (!liveData) {
                        const liveResult = await supabaseClient.functions.invoke("fpl-history", {body: {requestType: "gameweekPlayerData", gameweek: job.gameweek}});

                        if (liveResult.error) {
                            throw liveResult.error;
                        }

                        liveData = liveResult.data;

                        if (!Array.isArray(liveData)) {
                            throw new Error(`Invalid live FPL data for GW${job.gameweek}`);
                        }

                        gameweekLiveCache[job.gameweek] = liveData;
                    }

                    // ==================================
                    // FIND CAPTAIN SCORE
                    // ==================================

                    const livePlayer = liveData.find(item => Number(item.id) === captainElementId);

                    if (!livePlayer) {
                        throw new Error(`Captain ${captainName} not found in GW${job.gameweek} live data`);
                    }

                    const basePoints = Number(livePlayer.stats ?.total_points) || 0;
                    const captainPoints = basePoints * captainMultiplier;

                    // ==================================
                    // SAVE CHIP FIRST
                    // ==================================
                    //
                    // If a real chip was used and the
                    // chip save fails, don't mark the
                    // captain row complete. That lets
                    // the job retry on the next pass.
                    // ==================================

                    if (chip) {
                        const {error: chipSaveError} =
                            await supabaseClient
                                .from("player_chips")
                                .upsert({
                                        season_id: season.id,
                                        player_id: job.playerId,
                                        gameweek: job.gameweek,
                                        chip: chip},
                                    {onConflict: "season_id,player_id,gameweek"}
                                );

                        if (chipSaveError) {
                            console.error(`Unable to save chip for ${job.playerName} GW${job.gameweek}:`, chipSaveError);
                            throw chipSaveError;
                        }

                        debugLogPlayerImport(`${job.playerName} GW${job.gameweek} chip saved:`, chip);

                    }

                    // ==================================
                    // UPDATE CAPTAIN DATABASE FIELDS
                    // ==================================

                    const {error: updateError} =
                        await supabaseClient
                            .from("gameweek_scores")
                            .update({
                                captain_name: captainName,
                                captain_points: captainPoints,
                                captain_multiplier: captainMultiplier})
                            .eq("id", job.rowId);

                    if (updateError) {
                        throw updateError;
                    }

                    // ==================================
                    // SUCCESS
                    // ==================================

                    imported++;

                    let statusText = `GW${job.gameweek}: ` + `${captainName} ` + `(${captainPoints} pts)`;

                    if (chip) {
                        statusText += ` · ${chip}`;
                    }

                    updateImportStatus(job.playerId, job.playerName, "success", statusText);
                    debugLogPlayerImport(`${job.playerName} GW${job.gameweek}:`, captainName, captainPoints, captainMultiplier, chip);
                }
                catch(error) {
                    console.warn(`FPL captain data unavailable for ${job.playerName} GW${job.gameweek}:`, error);

                    failedJobs.push(job);

                    if (pass < maxPasses) {
                        updateImportStatus(job.playerId, job.playerName, "retry", `GW${job.gameweek} failed — queued for pass ${pass + 1}`);
                    }
                    else {
                        updateImportStatus(job.playerId, job.playerName, "failed", `GW${job.gameweek} unavailable from FPL — retry later`);
                    }
                }
                // ==================================
                // SHORT DELAY
                // ==================================

                await new Promise(resolve => setTimeout(resolve, 1500 + Math.floor(Math.random() * 1000)));
            }

            pendingJobs = failedJobs;

            // ======================================
            // WAIT BEFORE RETRY PASS
            // ======================================

            if (pendingJobs.length > 0 && pass < maxPasses) {
                updateImportSummary(`Pass ${pass} complete — ` + `${pendingJobs.length} failed. ` + `Waiting before retry...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }

        // ==========================================
        // FINAL SUMMARY
        // ==========================================

        const failed = pendingJobs.length;

        updateImportSummary(`Captain import complete — ` + `Imported: ${imported}, ` + `Skipped: ${initiallySkipped}, ` + `Failed: ${failed}`);

        debugLogPlayerImport("Captain import complete:", {imported, skipped: initiallySkipped, failed});

        if (failed > 0) {
           debugLogPlayerImport("Remaining captain failures:");

            pendingJobs.forEach(job => { debugLogPlayerImport(`${job.playerName} GW${job.gameweek}`);});
        }

        // ==========================================
        // UPDATE CAPTAIN IMPORT TIMESTAMP
        // ==========================================

        await loadScores(selectedGameweek);
        const captainImportTime = new Date().toISOString();
        await updateScoresTimestamp(captainImportTime, seasonId);
        scorePageSeason.captains_last_imported_at = captainImportTime;
        renderImportTimestamps(scorePageSeason);        
        //const selectedGameweek = Number(document.getElementById("gameweekSelector").value);
        //await updateDataPanels(currentSeasonId, selectedGameweek);
        
    }
    catch(error) {
        debugLogPlayerImport("Captain import failed:", error);
        updateImportSummary(`Captain import failed — ${error?.message ?? "Unknown error"}`);
    }
}

// ==========================================
// IMPORT STATUS
// ==========================================

function showImportStatus() {

    //debugLog("scores.js: showImportStatus Called");

    const panel = document.getElementById("fplImportStatus");

    if (!panel)
        return;

    panel.style.display = "block";
    document.getElementById("fplImportSummary").textContent = "Starting import...";
    document.getElementById("fplImportPlayers").innerHTML = "";
}

function updateImportStatus(playerId, playerName, status, message = "") {

    debugLog("scores.js: updateImportStatus Called");

    const container = document.getElementById("fplImportPlayers");

    if (!container)
        return;

    let row = document.getElementById(`fpl-import-player-${playerId}`);

    if (!row) {
        row = document.createElement("div");
        row.id = `fpl-import-player-${playerId}`;
        row.className = "fpl-import-player";
        container.appendChild(row);
    }

    let icon = "…";

    if (status ==="importing") {
        icon = "⏳";
    }
    else if (status === "success") {
        icon = "✓";
    }
    else if (status === "retry") {
        icon = "↻";
    }
    else if (status === "skipped") {
        icon = "—";
    }
    else if (status === "failed") {
        icon = "✗";
    }

    row.className = `fpl-import-player fpl-import-${status}`;
    
    row.innerHTML = `
        <span class="fpl-import-icon">
            ${icon}
        </span>

        <strong>
            ${playerName}
        </strong>

        <span>
            ${message}
        </span>
    `;
}

function updateImportSummary(text) {

    //debugLog("scores.js: updateImportSummary Called");

    const summary = document.getElementById("fplImportSummary");

    if (summary) {
        summary.textContent = text;
    }
}

// ==========================================
// UTILS
// ==========================================

async function checkValidGameweek() {

    debugLog("Admin.js: checkValidGameweek Called");

        debugLogPlayerImport("FPL current gameweek:", currentGameweek);

        if (!Number.isInteger(currentGameweek) || currentGameweek < 1) {
            console.log("No active FPL gameweek yet.");
            return false;
        }

        return true;
}

function renderImportTimestamps(season) {

    debugLog("scores.js: renderImportTimestamps Called");

    const scoresElement = document.getElementById("scoresLastImported");
    const captainsElement = document.getElementById("captainsLastImported");

    if (scoresElement) {
        scoresElement.textContent = formatImportTimestamp(season.scores_last_imported_at);
    }

    if (captainsElement) {
        captainsElement.textContent = formatImportTimestamp(season.captains_last_imported_at);
    }
}

function formatImportTimestamp(value) {

    debugLog("scores.js: formatImportTimestamp Called");

    if (!value)
        return "Never";

    return new Intl.DateTimeFormat("en-GB", {dateStyle: "medium", timeStyle: "short"}).format(new Date(value));
}

function mapFplChip(activeChip) {

    debugLog("scores.js: mapFplChip Called");

    switch (activeChip) {
        case "wildcard":
            return "WC";
        case "freehit":
            return "FH";
        case "bboost":
            return "BB";
        case "3xc":
            return "TC";
        default:
            return activeChip ?? null;
    }
}

// ==========================================
// START
// ==========================================

startupScores();