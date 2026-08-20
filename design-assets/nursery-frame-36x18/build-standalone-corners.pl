#!/usr/bin/env perl
use strict;
use warnings;

my $source_file = 'design-assets/nursery-frame-36x18/Trees and Mountains source.svg';
open my $source_handle, '<', $source_file or die "Cannot open $source_file: $!";
local $/;
my $source = <$source_handle>;
close $source_handle;

my ($art) = $source =~ m{(<g\s+id="layer1".*?</g>)}s;
die "Could not locate the source artwork group" unless $art;

my @corners = (
  ['top-left.svg',     '9in',  '5in',   '0 0 100.884055 56.444317',          'Top-left celestial and mountain corner'],
  ['top-right.svg',    '9in',  '5in',   '100.884055 0 100.884055 56.444317', 'Top-right moon and mountain corner'],
  ['bottom-left.svg',  '11in', '5.5in', '0 25.4 100.884055 50.422027',       'Bottom-left pine and mountain corner'],
  ['bottom-right.svg', '11in', '5.5in', '100.884055 25.4 100.884055 50.422027', 'Bottom-right pine and mountain corner'],
);

for my $corner (@corners) {
  my ($file, $width, $height, $view_box, $title) = @$corner;
  my $output = qq{<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="$view_box" preserveAspectRatio="xMidYMid meet">\n  <title>$title</title>\n$art\n</svg>\n};
  open my $handle, '>', "design-assets/nursery-frame-36x18/$file" or die "Cannot write $file: $!";
  print {$handle} $output;
  close $handle;
}

my $master = qq{<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="36in" height="18in" viewBox="0 0 36 18">
  <title>36 by 18 inch nursery frame — four-corner trees and mountains layout</title>
  <desc>Four self-contained corner crops derived from the supplied vector artwork. The center remains open.</desc>
  <svg id="corner-top-left" x="0" y="0" width="9" height="5" viewBox="0 0 100.884055 56.444317" preserveAspectRatio="xMinYMin meet">$art</svg>
  <svg id="corner-top-right" x="27" y="0" width="9" height="5" viewBox="100.884055 0 100.884055 56.444317" preserveAspectRatio="xMaxYMin meet">$art</svg>
  <svg id="corner-bottom-left" x="0" y="12.5" width="11" height="5.5" viewBox="0 25.4 100.884055 50.422027" preserveAspectRatio="xMinYMax meet">$art</svg>
  <svg id="corner-bottom-right" x="25" y="12.5" width="11" height="5.5" viewBox="100.884055 25.4 100.884055 50.422027" preserveAspectRatio="xMaxYMax meet">$art</svg>
</svg>
};

open my $master_handle, '>', 'design-assets/nursery-frame-36x18/nursery-frame-36x18-four-corners.svg' or die "Cannot write master: $!";
print {$master_handle} $master;
close $master_handle;
