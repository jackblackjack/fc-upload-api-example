#!/bin/bash

mongodb_etc_path=/etc
sudo sed -i -e"s/^#port =.*$/port = 27017/" ${mongodb_etc_path}/mongodb.conf
sudo sed -i -e"s/^bind_ip = 127.0.0.1$/bind_ip = 127.0.0.1,192.168.33.82/" ${mongodb_etc_path}/mongodb.conf

sudo service mongodb restart
