#!/bin/bash
#
# Creates files to deploy GroundControl.
#
# See below for details on how to deploy the files.
#

cd $(dirname $0)

# Firefox
(
cd firefox
rm -f ../GroundControl.xpi
zip -r ../GroundControl.xpi *
)
# To deploy the new version to Firefox users: run
#   scp GroundControl.xpi root@groundcontrol.rackspace.com:/var/www/
#
# I haven't figured out how we notify current users about updates.  For now,
# users will have to go re-install when they want to get newer versions.

# Chrome
(
zip -r GroundControl.zip chromium
)
# To deploy the new version to Chrome users:
# Log into https://chrome.google.com/extensions/developer/dashboard
# as groundcontrol@rackspace.com, update the extension with this .zip file,
# and choose Publish.
#
# You'll need to have bumped the version number in chromium/manifest.json or
# you'll get a complaint.
#
# Existing users of the extension will automatically be updated to the
# latest version within a few days.
