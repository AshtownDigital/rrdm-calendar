#!/bin/bash

# MongoDB Atlas connection for RRDM
# Replace <your_username> with your actual MongoDB Atlas username
export MONGODB_URI="mongodb+srv://rrdm-app:6qT7PVQReKGPYpLY@rrdm-cluster.evfi6hl.mongodb.net/rrdm?retryWrites=true&w=majority&appName=rrdm-cluster"

# Other environment variables
export NODE_ENV="development"
export USE_SIMPLE_SERVER="false"
export DISABLE_FILE_WATCHING="false"

echo "MongoDB Atlas environment variables set."
echo "Run 'source setup-atlas-env.sh' to load these variables."
