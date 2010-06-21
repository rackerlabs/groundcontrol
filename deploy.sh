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
