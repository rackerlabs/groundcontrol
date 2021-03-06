#!/bin/bash
#
# Creates files to deploy GroundControl.
#

cd $(dirname $0)

# Firefox
(
cd firefox
rm -f ../GroundControl.xpi
zip -r ../GroundControl.xpi *
)

# Chrome
(
zip -r GroundControl.zip chromium
)

clear

echo "
Created xpi (for Firefox) and zip (for Chrome) files.

To deploy the new version to Firefox users: run
  scp GroundControl.xpi root@groundcontrol.rackspace.com:/var/www/
  # password can be found on the ozone wiki page for GroundControl

I haven't figured out how we notify current users about updates.  For now,
users will have to go re-install when they want to get newer versions.

To deploy the new version to Chrome users:

  0. If you didn't increase chromium/manifest.json:"version" by one before
     running deploy.sh, do so and run it again :)
  1. Log into https://chrome.google.com/extensions/developer/dashboard
     as amesserl@rackspace.com [password is on the ozone wiki page for
     GroundControl]
  2. Update the extension with GroundControl.zip found in this directory
  3. Choose Publish.

Existing users of the extension will automatically be updated to the
latest version within a few days.
"
