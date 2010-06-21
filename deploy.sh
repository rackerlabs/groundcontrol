# Create deploy files.

cd $(dirname $0)

# Firefox
# You'll need to serve this .xpi file somewhere with a 
# mime type of application/x-xpinstall or Firefox won't
# recognize it.
(
cd firefox
rm -f ../GroundControl.xpi
zip -r ../GroundControl.xpi *
)

# Chrome
# Submit this to the Chrome Extensions Gallery.
(
zip -r GroundControl.zip chromium
)
