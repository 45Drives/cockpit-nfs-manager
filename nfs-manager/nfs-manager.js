/*
    Cockpit NFS Manager - Cockpit plugin for managing NFS.
    Copyright (C) 2021 Sam Silver <ssilver@45drives.com>

    This file is part of Cockpit NFS.
    Cockpit NFS Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    Cockpit NFS Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with Cockpit NFS Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

// Info popup loader
var success_icon_classes = ["pficon", "pficon-ok"];
var failure_icon_classes = ["pficon", "pficon-error-circle-o"];
var success_classes = ["alert", "alert-success"];
var failure_classes = ["alert", "alert-danger"];
var all_alert_classes = [...success_classes, ...failure_classes];
var all_icon_classes = [
    ...success_icon_classes,
    ...failure_icon_classes,
];

const timeout_ms = 3600; // info message timeout

var info_timeout = {}; // object to hold timeouts returned from setTimeout

/* Name: clear_info
 * Receives: id string for info fields in DOM
 * Does: clears alert
 * Returns: element objects for info div, icon, and text
 */
function clear_info(id) {
    var info = document.getElementById(id + "-info");
    var info_icon = document.getElementById(id + "-info-icon");
    var info_message = document.getElementById(id + "-info-text");
    info.classList.remove(...all_alert_classes);
    info_icon.classList.remove(...all_icon_classes);
    info_message.innerText = "";
    return [info, info_icon, info_message];
}

/* Name: set_error
 * Receives: id string for info fields in DOM, error message, optional timeout
 * time in milliseconds to clear message
 * Does: calls clear_info, sets icon and div to error classes, sets text to message,
 * clears old timeout, sets new timeout if passed.
 * Returns: nothing
 */
function set_error(id, message, timeout = -1) {
    [info, info_icon, info_message] = clear_info(id);
    info_icon.classList.add(...failure_icon_classes);
    info.classList.add(...failure_classes);
    info_message.innerText = message;
    if (typeof info_timeout[id] !== "undefined" && info_timeout[id] !== null)
        clearTimeout(info_timeout[id]);
    if (timeout > 0) {
        info_timeout[id] = setTimeout(function () {
            clear_info(id);
        }, timeout);
    }
}

/* Name: set_success
 * Receives: id string for info fields in DOM, message, optional timeout time
 * in milliseconds to clear message
 * Does: calls clear_info, sets icon and div to success classes, sets text to message,
 * clears old timeout, sets new timeout if passed.
 * Returns: nothing
 */
function set_success(id, message, timeout = -1) {
    [info, info_icon, info_message] = clear_info(id);
    info_icon.classList.add(...success_icon_classes);
    info.classList.add(...success_classes);
    info_message.innerText = message;
    if (typeof info_timeout[id] !== "undefined" && info_timeout[id] !== null)
        clearTimeout(info_timeout[id]);
    if (timeout > 0) {
        info_timeout[id] = setTimeout(function () {
            clear_info(id);
        }, timeout);
    }
}

/* Name: fatal_error
 * Receives: message
 * Does: calls set_error for infinite time with message attached. Disables all buttons.
 * clears old timeout, sets new timeout if passed.
 * Returns: nothing
 */
function fatal_error(message) {
    set_error("main", message);
    var all_buttons = document.getElementsByTagName("button");
    var backScreen = document.getElementById("blurred-screen");
    var spinner = document.getElementById("spinner");
    spinner.style.display = "none";
    backScreen.style.display = "inline-flex";
    for (let button of all_buttons) {
        button.disabled = true;
    }
}


/* Name: show_nfs_modal
 * Receives: Nothing 
 * Does: Shows "Add NFS" pop up
 * Returns: Nothing
 */
function show_nfs_modal() {
    var modal = document.getElementById("nfs-modal");
    modal.style.display = "block";
}

/* Name: hide_nfs_modal
 * Receives: Nothing 
 * Does: Hides "Add NFS" pop up
 * Returns: Nothing
 */
function hide_nfs_modal() {
    var modal = document.getElementById("nfs-modal");
    modal.style.display = "none";
}

/* Name: clear_setup_spinner
 * Receives: Nothing 
 * Does: Clears spinner logo from screen
 * Returns: Nothing
 */
function clear_setup_spinner() {
    var wrapper = document.getElementById("blurred-screen");
    wrapper.style.display = "none";
}

/* Name: create_nfs
 * Receives: Nothing 
 * Does: Takes inputted IP, and path and launches CLI command with said inputs
 * Returns: Nothing
 */
function create_nfs() {
    var ip = document.getElementById("input-ip").value;
    var path = document.getElementById("input-path").value;
    var name = document.getElementById("input-name").value;

    var proc = cockpit.spawn(["/usr/share/cockpit/nfs-manager/scripts/nfs_setup.py", name, path, ip]);
    proc.done(function () {
        set_success("nfs", "Successfully setup NFS! Now mount on your system.", timeout_ms);
        hide_nfs_modal()
    });
    proc.fail(function (data) {
        set_error("nfs", "Error: " + data, timeout_ms);
    });
}



/* Name: setup
 * Receives: Nothing 
 * Does: awaits populating the list of current NFS(s). Once finished setup buttons and clear branding
 * Returns: Nothing
 */
async function setup() {
    //await populate_nfs_list();
    set_up_buttons();
    clear_setup_spinner();
}

/* Name: check_nfs
 * Receives: Nothing 
 * Does: tries running `showmount -e` to check if nfs is installed, if successful, calls setup(), if unsuccessful,
 * shows error message and disables buttons
 * Returns: Nothing
 */
function check_nfs() {
    var proc = cockpit.spawn(["showmount", "-e"], { superuser: "require" });
    proc.done(function () {
        setup()
    });
    proc.fail(function (data) {
        fatal_error("Failed to load NFS services. Do you have NFS installed?")
    });
}

/* Name: check_permissions
 * Receives: Nothing 
 * Does: Checks if user is root. If not, give a fatal error, if yes, call check_nfs.
 * Returns: Nothing
 */
function check_permissions() {
    let root_check = cockpit.permission({ admin: true });
	root_check.addEventListener(
		"changed", 
		function() {
			if(root_check.allowed){
				check_nfs();
			}else{
				fatal_error("You do not have administrator access.");
			}
	 	}
	)
}

/* Name: set_up_buttons
 * Receives: Nothing 
 * Does: Sets up buttons
 * Returns: Nothing
 */
function set_up_buttons() {
    document.getElementById("add-nfs-btn").addEventListener("click", create_nfs);
    document.getElementById("show-nfs-modal").addEventListener("click", show_nfs_modal);
    document.getElementById("hide-nfs-modal").addEventListener("click", hide_nfs_modal);
}

/* Name: main
 * Receives: Nothing 
 * Does: Runs check_permissions to see if user is superuser
 * Returns: Nothing
 */
function main() {
    check_permissions()
}

main();