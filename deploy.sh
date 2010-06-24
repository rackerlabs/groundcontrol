# Create files to deploy GroundControl.

cd $(dirname $0)

# Firefox
# You'll need to serve this .xpi file somewhere with a mime type of
# application/x-xpinstall or Firefox won't recognize it.  I haven't figured out
# how we notify current users about updates.
(
cd firefox
rm -f ../GroundControl.xpi
zip -r ../GroundControl.xpi *
)

# Chrome
# Log into https://chrome.google.com/extensions/developer/dashboard?hl=en 
# as groundcontrol@rackspace.com and update the extension with this .zip file.
# You'll need to have updated the version number in the manifest.json or you'll
# get a complaint.
(
zip -r GroundControl.zip chromium
)
