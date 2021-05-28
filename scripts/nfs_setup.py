#!/usr/bin/env python3

import re
import sys
import subprocess
from optparse import OptionParser

# Name: create_dir
# Receives: Path
# Does: Checks if directory exists, if not, create it.
# Returns: Nothing
def create_dir(path):
    if subprocess.call(["stat", path], stdout=subprocess.PIPE, stderr=subprocess.PIPE) == 0:
        print("Directory already exist, using it...")
        return
    try:
        print("Creating directory:", path)
        subprocess.run(["mkdir", "-p", path])
    except OSError:
        print("Cannot make directory.")
        sys.exit(1)
        
# Name: create_permissions
# Receives: Path
# Does: Updates permissions of new made or existing path.
# Returns: Nothing
def create_permissions(path):
    print("Writing permissions...")
    proc = subprocess.call(["chown", "nobody:nogroup", path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    proc2 = subprocess.call(["chmod", "777", path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if (proc == 1 | proc2 == 1):
        print("Could not change permissions.")
        sys.exit(1)

# Name: write_exports
# Receives: Path and client ip
# Does: Enters path and clients ip into exports config.
# Returns: Nothing
def write_exports(path, ip):
    print("Writing to /etc/exports")
    with open("/etc/exports", "a") as f:
        f.write("\n" + path + " " + ip + "(rw,sync,no_subtree_check)")

# Name: reset_config
# Receives: Nothing
# Does: Export new shared directory as well as restart the nfs system.
# Returns: Nothing
def reset_config():
    try:
        subprocess.run(["exportfs", "-a"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("Exporting new share permissions...")
    except OSError:
        print("Could not exportfs -a.")
        sys.exit(1)
    try:
        subprocess.run(["systemctl", "restart", "nfs-kernel-system"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print("Restarting nfs-kernel-system...")
    except OSError:
        print("Could not restart nfs-kernel-system, do you have it on your system?")
        sys.exit(1)

# Name: make_nfs
# Receives: Path
# Does: Runs all functions that launches certian commands to make nfs
# Returns: Nothing
def make_nfs(path, ip):
    create_dir(path)
    create_permissions(path)
    write_exports(path, ip)
    reset_config()
    print("Done! Please mount " + path + " to your directory of choosing on your own computer!")
    print("sudo mount <host-ip>:" + path + " <path to dir>")

# Name: main
# Receives: nothing
# Does: Checks all the arguments and flags. Makes sure the user entered enough
# arguments. Chucks arguments into make_nfs function
# Returns: Nothing
def main():
    parser = OptionParser()
    (options, args) = parser.parse_args()
    if len(args) < 2:
        print("Not enough arguments!\nnfs_setup <path> <client-ip>")
        sys.exit(1)
    make_nfs(args[0], args[1])

if __name__ == "__main__":
    main()
    sys.exit(0)