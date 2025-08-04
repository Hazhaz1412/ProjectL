#!/bin/sh
# Đợi MongoDB sẵn sàng
sleep 8

mongosh --host mongo-write:27017 <<EOF
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-write:27017" },
    { _id: 1, host: "mongo-read:27017" }
  ]
})
EOF
