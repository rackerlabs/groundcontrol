# Create files to deploy GroundControl.

cd $(dirname $0)

# Firefox
(
cd firefox
rm -f ../GroundControl.xpi
zip -r ../GroundControl.xpi *
)
# Now run
#   scp GroundControl.xpi root@groundcontrol.rackspace.com:/var/www/
# I haven't figured out how we notify current users about updates.

# Chrome
(
zip -r GroundControl.zip chromium
)
# Log into https://chrome.google.com/extensions/developer/dashboard?hl=en 
# as groundcontrol@rackspace.com and update the extension with this .zip file.
# You'll need to have updated the version number in the manifest.json or you'll
# get a complaint.
