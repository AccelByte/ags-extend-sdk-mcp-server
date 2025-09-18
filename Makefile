# Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
# This is licensed software from AccelByte Inc, for limitations
# and restrictions contact your company contract manager.

SHELL := /bin/sh

PORT ?= 3000
IMAGE ?= extend-sdk-mcp-server
TAG ?= latest
LOG_LEVEL ?= info

.PHONY: build run

build:
	docker build -t $(IMAGE):$(TAG) .

run:
	@test -n "$(CONFIG_DIR)" || (echo "CONFIG_DIR is not set" ; exit 1)
	docker run --rm -it \
		-p $(PORT):3000 \
		-v "$(CONFIG_DIR)":/app/config:ro \
		-e PORT=$(PORT) \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-e CONFIG_DIR=/app/config \
	  	$(IMAGE):$(TAG)
