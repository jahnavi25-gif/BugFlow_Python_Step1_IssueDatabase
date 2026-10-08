(function () {
    "use strict";

    /* =========================================================
       CONFIGURATION
    ========================================================= */

    const API = "/api/v1";

    let dashboardData = null;
    let allIssues = [];
    let dateFilterActive = false;


    /* =========================================================
       TOKEN
    ========================================================= */

    function getToken() {

        const keys = [
            "bugflow_token",
            "access_token",
            "token"
        ];

        for (const key of keys) {

            const value =
                sessionStorage.getItem(key) ||
                localStorage.getItem(key);

            if (value) {
                return value;
            }
        }

        return null;
    }


    /* =========================================================
       API
    ========================================================= */

    async function apiFetch(path, options = {}) {

        const token = getToken();

        const headers = {
            "Accept": "application/json",
            ...(options.headers || {})
        };

        if (
            options.body &&
            !headers["Content-Type"]
        ) {
            headers["Content-Type"] = "application/json";
        }

        if (token) {
            headers["Authorization"] =
                "Bearer " + token;
        }

        const response = await fetch(
            API + path,
            {
                ...options,
                headers
            }
        );

        console.log(
            "[Workflow] API:",
            API + path,
            response.status
        );

        if (!response.ok) {

            const text = await response.text();

            throw new Error(
                "API " +
                response.status +
                ": " +
                (text || response.statusText)
            );
        }

        const contentType =
            response.headers.get("content-type");

        if (
            contentType &&
            contentType.includes("application/json")
        ) {
            return await response.json();
        }

        return await response.text();
    }


    async function apiGet(path) {

        return apiFetch(
            path,
            {
                method: "GET"
            }
        );
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent =
                String(value ?? 0);
        }
    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getStatus(issue) {

        return String(
            issue?.status || ""
        )
            .toUpperCase()
            .trim();
    }


    function countStatus(issues, statuses) {

        const statusSet =
            new Set(statuses);

        return issues.filter(
            issue =>
                statusSet.has(
                    getStatus(issue)
                )
        ).length;
    }


    function formatDate(value) {

        if (!value) {
            return "";
        }

        return new Date(
            value + "T00:00:00"
        ).toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    /* =========================================================
       DASHBOARD CARDS
    ========================================================= */

    function renderCards(
        issues,
        backendStats = null
    ) {

        const total =
            issues.length;

        const resolved =
            countStatus(
                issues,
                ["RESOLVED"]
            );

        const closed =
            countStatus(
                issues,
                ["CLOSED"]
            );

        const inProgress =
            countStatus(
                issues,
                ["IN_PROGRESS"]
            );


        /*
         * IMPORTANT:
         *
         * When the normal dashboard is loaded,
         * use the backend statistics.
         *
         * When a date filter is active, use the
         * filtered issue list instead.
         */

        const useBackendStats =
            backendStats &&
            !dateFilterActive;


        const totalValue =
            useBackendStats &&
            Number.isFinite(
                Number(
                    backendStats.total_issues
                )
            )
                ? Number(
                    backendStats.total_issues
                )
                : total;


        const resolvedValue =
            useBackendStats &&
            Number.isFinite(
                Number(
                    backendStats.resolved_issues
                )
            )
                ? Number(
                    backendStats.resolved_issues
                )
                : resolved;


        const progressValue =
            useBackendStats &&
            Number.isFinite(
                Number(
                    backendStats.in_progress_issues
                )
            )
                ? Number(
                    backendStats.in_progress_issues
                )
                : inProgress;


        const completedValue =
            useBackendStats &&
            Number.isFinite(
                Number(
                    backendStats.resolved
                )
            )
                ? Number(
                    backendStats.resolved || 0
                ) +
                Number(
                    backendStats.closed || 0
                )
                : resolved + closed;


        setText(
            "totalIssues",
            totalValue
        );

        setText(
            "resolvedIssues",
            resolvedValue
        );

        setText(
            "progressIssues",
            progressValue
        );

        setText(
            "completedIssues",
            completedValue
        );


        console.log(
            "[Workflow] Cards:",
            {
                total: totalValue,
                resolved: resolvedValue,
                inProgress: progressValue,
                completed: completedValue
            }
        );
    }


    /* =========================================================
       WORKFLOW
    ========================================================= */

    function renderWorkflow(issues) {

        const container =
            document.querySelector(
                ".workflow-steps"
            );

        if (!container) {
            return;
        }


        const planning =
            countStatus(
                issues,
                [
                    "REPORTED",
                    "TRIAGED"
                ]
            );


        const active =
            countStatus(
                issues,
                ["IN_PROGRESS"]
            );


        const review =
            countStatus(
                issues,
                ["QA_VERIFICATION"]
            );


        const completed =
            countStatus(
                issues,
                [
                    "RESOLVED",
                    "CLOSED"
                ]
            );


        container.innerHTML = `

            <div class="step">

                <span>
                    <i class="fa-solid fa-clipboard-list"></i>
                </span>

                <small>
                    Planning
                </small>

                <strong>
                    ${planning}
                </strong>

            </div>


            <div class="step">

                <span>
                    <i class="fa-solid fa-spinner"></i>
                </span>

                <small>
                    Active
                </small>

                <strong>
                    ${active}
                </strong>

            </div>


            <div class="step">

                <span>
                    <i class="fa-solid fa-magnifying-glass"></i>
                </span>

                <small>
                    Review
                </small>

                <strong>
                    ${review}
                </strong>

            </div>


            <div class="step">

                <span>
                    <i class="fa-solid fa-check"></i>
                </span>

                <small>
                    Completed
                </small>

                <strong>
                    ${completed}
                </strong>

            </div>

        `;


        let current = 0;

        if (completed > 0) {
            current = 4;
        }
        else if (review > 0) {
            current = 3;
        }
        else if (active > 0) {
            current = 2;
        }
        else if (planning > 0) {
            current = 1;
        }


        container
            .querySelectorAll(".step")
            .forEach(
                (step, index) => {

                    const number =
                        index + 1;

                    if (
                        current > 0 &&
                        number < current
                    ) {
                        step.classList.add(
                            "completed"
                        );
                    }

                    if (
                        number === current
                    ) {
                        step.classList.add(
                            "active"
                        );
                    }
                }
            );
    }


    /* =========================================================
       CATEGORY DISTRIBUTION
    ========================================================= */

    function renderDistribution(issues) {

        const total =
            document.getElementById(
                "distributionTotal"
            );

        if (total) {
            total.textContent =
                issues.length;
        }


        const counts = {};


        issues.forEach(issue => {

            const type =
                issue.issue_type ||
                issue.type ||
                issue.category ||
                "Other";

            counts[type] =
                (counts[type] || 0) + 1;
        });


        const legend =
            document.getElementById(
                "categoryLegend"
            );

        if (!legend) {
            return;
        }


        legend.innerHTML =
            Object.entries(counts)
                .map(
                    ([name, count]) => `

                        <div class="legend-row">

                            <span class="legend-label">
                                ${escapeHtml(name)}
                            </span>

                            <strong>
                                ${count}
                            </strong>

                        </div>

                    `
                )
                .join("");
    }


    /* =========================================================
       PROGRESS
    ========================================================= */

    function renderProgress(issues) {

        const total =
            issues.length;


        const completed =
            countStatus(
                issues,
                [
                    "RESOLVED",
                    "CLOSED"
                ]
            );


        const active =
            countStatus(
                issues,
                ["IN_PROGRESS"]
            );


        const todo =
            Math.max(
                0,
                total -
                completed -
                active
            );


        const percent =
            total > 0
                ? Math.round(
                    (
                        completed /
                        total
                    ) * 100
                )
                : 0;


        setText(
            "progressDone",
            completed
        );

        setText(
            "progressDoing",
            active
        );

        setText(
            "progressTodo",
            todo
        );

        setText(
            "completionPercent",
            percent + "%"
        );


        const bar =
            document.getElementById(
                "progressBar"
            );

        if (bar) {
            bar.style.width =
                percent + "%";
        }
    }


    /* =========================================================
       TEAM
    ========================================================= */

    function renderTeam(team) {

        const container =
            document.getElementById(
                "teamList"
            );

        if (!container) {
            return;
        }


        const members =
            Array.isArray(team)
                ? team
                : [];


        if (!members.length) {

            container.innerHTML =
                "<p>No team data available.</p>";

            return;
        }


        container.innerHTML =
            members
                .map(member => {

                    const name =
                        member.full_name ||
                        member.name ||
                        member.username ||
                        "Team member";


                    return `

                        <div class="team-member">

                            <div class="team-avatar">
                                ${escapeHtml(
                                    String(name)
                                )
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            <strong>
                                ${escapeHtml(
                                    String(name)
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    String(
                                        member.team || ""
                                    )
                                )}
                            </span>

                        </div>

                    `;
                })
                .join("");
    }


    /* =========================================================
       PROJECTS
    ========================================================= */

    function renderProjects(projects) {

        const container =
            document.getElementById(
                "projectList"
            );

        if (!container) {
            return;
        }


        const list =
            Array.isArray(projects)
                ? projects
                : [];


        container.innerHTML =
            list
                .map(project => {

                    const name =
                        typeof project === "string"
                            ? project
                            : (
                                project.project_name ||
                                project.name ||
                                "Project"
                            );


                    return `

                        <div class="project-item">
                            ${escapeHtml(
                                String(name)
                            )}
                        </div>

                    `;
                })
                .join("");
    }


    /* =========================================================
       ISSUES LIST
    ========================================================= */

    function renderIssuesList(issues) {

        const container =
            document.getElementById(
                "issuesContainer"
            ) ||
            document.getElementById(
                "issuesList"
            ) ||
            document.getElementById(
                "issueList"
            );


        if (!container) {
            return;
        }


        if (!issues.length) {

            container.innerHTML =
                "<p>No issues found.</p>";

            return;
        }


        container.innerHTML =
            issues
                .map(
                    issue => `

                        <div class="workflow-issue">

                            <div class="issue-title">
                                ${escapeHtml(
                                    String(
                                        issue.title ||
                                        "Untitled issue"
                                    )
                                )}
                            </div>

                            <div class="issue-meta">

                                #${escapeHtml(
                                    String(
                                        issue.id || ""
                                    )
                                )}

                                ${escapeHtml(
                                    getStatus(issue)
                                )}

                            </div>

                        </div>

                    `
                )
                .join("");
    }


    /* =========================================================
       RENDER DASHBOARD
    ========================================================= */

    function renderDashboard(
        data,
        issuesOverride = null
    ) {

        /*
         * Only dashboard loading should update
         * dashboardData.
         */

        dashboardData = data;


        const stats =
            data?.stats || {};


        const issues =
            Array.isArray(issuesOverride)
                ? issuesOverride
                : (
                    Array.isArray(data?.all_issues)
                        ? data.all_issues
                        : (
                            Array.isArray(data?.issues)
                                ? data.issues
                                : []
                        )
                );


        allIssues = issues;


        console.log(
            "[Workflow] RESPONSE:",
            data
        );

        console.log(
            "[Workflow] STATS:",
            stats
        );

        console.log(
            "[Workflow] ISSUES:",
            issues
        );


        renderCards(
            issues,
            stats
        );

        renderWorkflow(
            issues
        );

        renderDistribution(
            issues
        );

        renderProgress(
            issues
        );

        renderIssuesList(
            issues
        );

        renderTeam(
            data?.developers ||
            data?.team ||
            []
        );

        renderProjects(
            data?.projects ||
            []
        );
    }


    /* =========================================================
       LOAD DASHBOARD
       
       IMPORTANT:
       This is the ONLY place that loads the dashboard.
       Smart Triage does NOT call this function.
    ========================================================= */

    async function loadDashboard() {

        try {

            console.log(
                "[Workflow] Loading dashboard..."
            );


            const data =
                await apiGet(
                    "/role-dashboard"
                );


            console.log(
                "[Workflow] Dashboard data:",
                data
            );


            /*
             * A successful dashboard response
             * replaces dashboardData/allIssues.
             */

            dateFilterActive = false;

            renderDashboard(data);

        }
        catch (error) {

            console.error(
                "[Workflow] Dashboard load failed:",
                error
            );


            /*
             * IMPORTANT:
             *
             * If the dashboard was already loaded,
             * do not replace the correct numbers
             * with zeroes just because a later refresh
             * failed.
             */

            if (!dashboardData) {

                setText(
                    "totalIssues",
                    0
                );

                setText(
                    "resolvedIssues",
                    0
                );

                setText(
                    "progressIssues",
                    0
                );

                setText(
                    "completedIssues",
                    0
                );
            }
        }
    }


    /* =========================================================
       DATE PICKER
       Working fixed-position implementation.
    ========================================================= */

    function setupDatePicker() {

        const button =
            document.getElementById(
                "dateButton"
            );

        const picker =
            document.getElementById(
                "datePicker"
            );

        const start =
            document.getElementById(
                "startDate"
            );

        const end =
            document.getElementById(
                "endDate"
            );

        const range =
            document.getElementById(
                "dateRange"
            );

        const apply =
            document.getElementById(
                "applyDates"
            );

        const clear =
            document.getElementById(
                "clearDates"
            );


        if (!button || !picker) {

            console.warn(
                "[Workflow] Date picker elements not found."
            );

            return;
        }


        let pickerOpen = false;


        function forcePickerStyle() {

            picker.style.setProperty(
                "position",
                "fixed",
                "important"
            );

            picker.style.setProperty(
                "z-index",
                "2147483647",
                "important"
            );

            picker.style.setProperty(
                "display",
                "block",
                "important"
            );

            picker.style.setProperty(
                "visibility",
                "visible",
                "important"
            );

            picker.style.setProperty(
                "opacity",
                "1",
                "important"
            );

            picker.style.setProperty(
                "box-sizing",
                "border-box",
                "important"
            );

            picker.style.setProperty(
                "margin",
                "0",
                "important"
            );

            picker.style.setProperty(
                "overflow",
                "visible",
                "important"
            );

            picker.style.setProperty(
                "pointer-events",
                "auto",
                "important"
            );
        }


        function positionPicker() {

            if (!pickerOpen) {
                return;
            }


            if (
                picker.parentElement !==
                document.body
            ) {
                document.body.appendChild(
                    picker
                );
            }


            forcePickerStyle();


            const rect =
                button.getBoundingClientRect();


            const viewportWidth =
                window.innerWidth;

            const viewportHeight =
                window.innerHeight;


            const popupWidth =
                Math.min(
                    330,
                    viewportWidth - 20
                );


            let left =
                rect.left;

            let top =
                rect.bottom + 8;


            picker.style.setProperty(
                "width",
                popupWidth + "px",
                "important"
            );

            picker.style.setProperty(
                "max-width",
                (viewportWidth - 20) + "px",
                "important"
            );


            if (
                left + popupWidth >
                viewportWidth - 10
            ) {
                left =
                    viewportWidth -
                    popupWidth -
                    10;
            }


            if (left < 10) {
                left = 10;
            }


            const popupHeight =
                picker.offsetHeight;


            if (
                top + popupHeight >
                viewportHeight - 10
            ) {

                const topPosition =
                    rect.top -
                    popupHeight -
                    8;


                if (topPosition >= 10) {

                    top = topPosition;

                }
                else {

                    top =
                        Math.max(
                            10,
                            Math.min(
                                top,
                                viewportHeight -
                                popupHeight -
                                10
                            )
                        );
                }
            }


            picker.style.setProperty(
                "left",
                left + "px",
                "important"
            );

            picker.style.setProperty(
                "top",
                top + "px",
                "important"
            );

            picker.style.setProperty(
                "right",
                "auto",
                "important"
            );

            picker.style.setProperty(
                "bottom",
                "auto",
                "important"
            );
        }


        function openPicker() {

            pickerOpen = true;


            if (
                picker.parentElement !==
                document.body
            ) {
                document.body.appendChild(
                    picker
                );
            }


            picker.classList.add(
                "show"
            );


            forcePickerStyle();


            requestAnimationFrame(() => {

                positionPicker();

                requestAnimationFrame(
                    positionPicker
                );
            });
        }


        function closePicker() {

            pickerOpen = false;


            picker.classList.remove(
                "show"
            );


            picker.style.setProperty(
                "display",
                "none",
                "important"
            );
        }


        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                if (pickerOpen) {
                    closePicker();
                }
                else {
                    openPicker();
                }
            }
        );


        picker.addEventListener(
            "click",
            function (event) {
                event.stopPropagation();
            }
        );


        if (apply) {

            apply.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();


                    if (!start || !end) {
                        return;
                    }


                    if (
                        !start.value ||
                        !end.value
                    ) {

                        alert(
                            "Please select both dates."
                        );

                        return;
                    }


                    if (
                        start.value >
                        end.value
                    ) {

                        alert(
                            "Start date must be before end date."
                        );

                        return;
                    }


                    if (range) {

                        range.textContent =
                            formatDate(
                                start.value
                            ) +
                            " - " +
                            formatDate(
                                end.value
                            );
                    }


                    const startTime =
                        new Date(
                            start.value +
                            "T00:00:00"
                        ).getTime();


                    const endTime =
                        new Date(
                            end.value +
                            "T23:59:59"
                        ).getTime();


                    const filtered =
                        allIssues.filter(
                            issue => {

                                if (
                                    !issue.created_at
                                ) {
                                    return false;
                                }


                                const issueTime =
                                    new Date(
                                        issue.created_at
                                    ).getTime();


                                return (
                                    issueTime >=
                                    startTime &&
                                    issueTime <=
                                    endTime
                                );
                            }
                        );


                    console.log(
                        "[Workflow] Date filter:",
                        {
                            start: start.value,
                            end: end.value,
                            results: filtered.length
                        }
                    );


                    dateFilterActive = true;


                    renderCards(
                        filtered,
                        null
                    );

                    renderWorkflow(
                        filtered
                    );

                    renderDistribution(
                        filtered
                    );

                    renderProgress(
                        filtered
                    );

                    renderIssuesList(
                        filtered
                    );


                    closePicker();
                }
            );
        }


        if (clear) {

            clear.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();


                    if (start) {
                        start.value = "";
                    }

                    if (end) {
                        end.value = "";
                    }


                    if (range) {
                        range.textContent =
                            "Select dates";
                    }


                    dateFilterActive = false;


                    /*
                     * Restore the original dashboard.
                     */

                    if (dashboardData) {
                        renderDashboard(
                            dashboardData
                        );
                    }


                    closePicker();
                }
            );
        }


        document.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    button
                ) {
                    return;
                }


                if (
                    picker.contains(
                        event.target
                    )
                ) {
                    return;
                }


                closePicker();
            }
        );


        window.addEventListener(
            "resize",
            function () {

                if (pickerOpen) {
                    positionPicker();
                }
            }
        );


        window.addEventListener(
            "scroll",
            function () {

                if (pickerOpen) {
                    positionPicker();
                }
            },
            true
        );
    }


    /* =========================================================
       SMART TRIAGE
       
       IMPORTANT:
       This function NEVER calls loadDashboard().
       It ONLY displays the triage result.
    ========================================================= */

    function setupSmartTriage() {

        const button =
            document.getElementById(
                "triageButton"
            );

        const titleInput =
            document.getElementById(
                "triageTitle"
            );

        const categoryInput =
            document.getElementById(
                "triageCategory"
            );

        const resultBox =
            document.getElementById(
                "triageResult"
            );


        if (
            !button ||
            !titleInput ||
            !categoryInput ||
            !resultBox
        ) {

            console.warn(
                "[Workflow] Smart Triage elements not found."
            );

            return;
        }


        if (
            button.dataset.triageReady ===
            "true"
        ) {
            return;
        }


        button.dataset.triageReady =
            "true";


        button.addEventListener(
            "click",
            async function (event) {

                /*
                 * VERY IMPORTANT:
                 *
                 * Prevent form submission/page reload.
                 */

                event.preventDefault();
                event.stopPropagation();


                const title =
                    titleInput.value.trim();


                const category =
                    categoryInput.value;


                if (!title) {

                    alert(
                        "Please enter an issue title."
                    );

                    titleInput.focus();

                    return;
                }


                button.disabled = true;


                button.innerHTML = `
                    Analyzing...
                    <i class="fa-solid fa-spinner fa-spin"></i>
                `;


                resultBox.innerHTML = `

                    <div class="robot">
                        <i class="fa-solid fa-robot"></i>
                    </div>

                    <div>

                        <h3>
                            Triage Result
                        </h3>

                        <p>
                            Analyzing the issue...
                        </p>

                    </div>

                `;


                try {

                    /*
                     * Backend expects:
                     *
                     * title
                     * description
                     * severity
                     * category
                     */

                    const payload = {

                        title: title,

                        description: title,

                        severity: "MAJOR",

                        category:
                            category || null

                    };


                    console.log(
                        "[Workflow] Sending triage request:",
                        payload
                    );


                    /*
                     * REAL BACKEND ENDPOINT
                     */

                    const result =
                        await apiFetch(
                            "/issues/triage-recommendation",
                            {
                                method: "POST",

                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );


                    console.log(
                        "[Workflow] Triage result:",
                        result
                    );


                    const priority =
                        result?.priority ||
                        "Not specified";


                    const score =
                        result?.priority_score;


                    const severity =
                        result?.severity ||
                        "MAJOR";


                    const urgency =
                        result?.category_urgency ||
                        "Not specified";


                    const developers =
                        Array.isArray(
                            result?.recommended_developers
                        )
                            ? result.recommended_developers
                            : [];


                    let developersHtml =
                        "";


                    if (developers.length) {

                        developersHtml = `

                            <div
                                class="triage-developers"
                                style="
                                    margin-top:12px;
                                "
                            >

                                <strong>
                                    Recommended Developers
                                </strong>

                                <ul
                                    style="
                                        margin-top:6px;
                                        padding-left:20px;
                                    "
                                >

                                    ${developers
                                        .map(
                                            developer => {

                                                const name =
                                                    developer.developer ||
                                                    developer.full_name ||
                                                    developer.username ||
                                                    "Developer";


                                                const match =
                                                    developer.match_percentage;


                                                return `

                                                    <li>

                                                        ${escapeHtml(
                                                            String(name)
                                                        )}

                                                        ${
                                                            match !==
                                                            undefined
                                                                ? `
                                                                    -
                                                                    ${escapeHtml(
                                                                        String(
                                                                            match
                                                                        )
                                                                    )}%
                                                                    match
                                                                  `
                                                                : ""
                                                        }

                                                    </li>

                                                `;
                                            }
                                        )
                                        .join("")}

                                </ul>

                            </div>

                        `;
                    }


                    /*
                     * IMPORTANT:
                     *
                     * We ONLY update triageResult here.
                     *
                     * DO NOT:
                     *
                     * loadDashboard()
                     * renderDashboard()
                     * renderCards()
                     * allIssues = []
                     * dashboardData = ...
                     *
                     * The existing dashboard metrics must
                     * remain untouched.
                     */

                    resultBox.innerHTML = `

                        <div class="robot">

                            <i class="fa-solid fa-robot"></i>

                        </div>


                        <div>

                            <h3>
                                Triage Result
                            </h3>


                            <p>

                                AI triage analysis
                                completed successfully.

                            </p>


                            <div
                                class="triage-result-details"
                                style="
                                    margin-top:12px;
                                    display:flex;
                                    flex-wrap:wrap;
                                    gap:10px;
                                "
                            >

                                <span>

                                    Category:

                                    <strong>
                                        ${escapeHtml(
                                            String(
                                                category ||
                                                "Not specified"
                                            )
                                        )}
                                    </strong>

                                </span>


                                <span>

                                    Priority:

                                    <strong>
                                        ${escapeHtml(
                                            String(
                                                priority
                                            )
                                        )}
                                    </strong>

                                </span>


                                <span>

                                    Severity:

                                    <strong>
                                        ${escapeHtml(
                                            String(
                                                severity
                                            )
                                        )}
                                    </strong>

                                </span>


                                <span>

                                    Score:

                                    <strong>
                                        ${escapeHtml(
                                            String(
                                                score ??
                                                "N/A"
                                            )
                                        )}
                                    </strong>

                                </span>


                                <span>

                                    Urgency:

                                    <strong>
                                        ${escapeHtml(
                                            String(
                                                urgency
                                            )
                                        )}
                                    </strong>

                                </span>

                            </div>


                            ${developersHtml}

                        </div>

                    `;


                    /*
                     * NO DASHBOARD REFRESH HERE.
                     *
                     * This is the key fix.
                     */

                }
                catch (error) {

                    console.error(
                        "[Workflow] Triage error:",
                        error
                    );


                    resultBox.innerHTML = `

                        <div class="robot">

                            <i
                                class="fa-solid fa-triangle-exclamation"
                            ></i>

                        </div>


                        <div>

                            <h3>
                                Triage Failed
                            </h3>

                            <p>
                                ${escapeHtml(
                                    error.message
                                )}
                            </p>

                        </div>

                    `;


                    alert(
                        "Unable to run Smart Triage.\n\n" +
                        error.message
                    );
                }
                finally {

                    button.disabled = false;

                    button.innerHTML = `
                        Run Triage
                        <i class="fa-solid fa-gear"></i>
                    `;
                }
            }
        );
    }


    /* =========================================================
       CREATE ISSUE
    ========================================================= */

    function setupCreateIssue() {

        const button =
            document.getElementById(
                "createIssue"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();


                const title =
                    prompt(
                        "Enter issue title:"
                    );


                if (!title) {
                    return;
                }


                try {

                    const issue =
                        await apiFetch(
                            "/issues",
                            {
                                method: "POST",

                                body:
                                    JSON.stringify(
                                        {
                                            title:
                                                title,

                                            category:
                                                "Bug",

                                            priority:
                                                "Medium",

                                            severity:
                                                "Minor",

                                            status:
                                                "To Do"
                                        }
                                    )
                            }
                        );


                    alert(
                        `Created ${
                            issue.issue_key ||
                            issue.id ||
                            "issue"
                        }`
                    );


                    /*
                     * Creating an issue SHOULD refresh
                     * the dashboard because the data actually
                     * changed.
                     */

                    await loadDashboard();

                }
                catch (error) {

                    console.error(
                        "[Workflow] Create issue failed:",
                        error
                    );


                    alert(
                        "Unable to create issue.\n\n" +
                        error.message
                    );
                }
            }
        );
    }


    /* =========================================================
       SEARCH
    ========================================================= */

    function setupSearch() {

        const search =
            document.getElementById(
                "globalSearch"
            );


        if (!search) {
            return;
        }


        let timer;


        search.addEventListener(
            "input",
            function (event) {

                clearTimeout(timer);


                timer =
                    setTimeout(
                        function () {

                            searchIssues(
                                event.target.value
                            );

                        },
                        300
                    );
            }
        );
    }


    async function searchIssues(value) {

        if (
            !value ||
            !value.trim()
        ) {
            return;
        }


        try {

            const data =
                await apiGet(
                    "/issues?search=" +
                    encodeURIComponent(
                        value
                    )
                );


            console.log(
                "[Workflow] Search results:",
                data
            );

        }
        catch (error) {

            console.error(
                "[Workflow] Search failed:",
                error
            );
        }
    }


    /* =========================================================
       THEME
    ========================================================= */

    function setupTheme() {

        const button =
            document.getElementById(
                "themeButton"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            function () {

                document.body.classList.toggle(
                    "light-mode"
                );

            }
        );
    }


    /* =========================================================
       START
    ========================================================= */

    function start() {

        console.log(
            "[Workflow] FINAL Workflow.js loaded"
        );


        /*
         * UI controls
         */

        setupDatePicker();

        setupSmartTriage();

        setupCreateIssue();

        setupSearch();

        setupTheme();


        /*
         * Load dashboard ONCE.
         *
         * Smart Triage will NOT call this again.
         */

        loadDashboard();
    }


    /* =========================================================
       DOM READY
    ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    }
    else {

        start();
    }

})();
