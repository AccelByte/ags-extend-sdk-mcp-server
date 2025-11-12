.PHONY: build run run-http run-stdio stop clean shell

# Docker image configuration
IMAGE_NAME := extend-sdk-mcp-server
IMAGE_TAG := latest
FULL_IMAGE_NAME := $(IMAGE_NAME):$(IMAGE_TAG)

# Default configuration
CONFIG_DIR ?= config/go
TRANSPORT ?= stdio
PORT ?= 3000
LOG_LEVEL ?= info
NODE_ENV ?= production

# Container name
CONTAINER_NAME := $(IMAGE_NAME)

build: ## Build the Docker image
	@echo "Building Docker image $(FULL_IMAGE_NAME)..."
	docker build -t $(FULL_IMAGE_NAME) .
	@echo "Build complete!"

run: run-stdio ## Run the Docker container with STDIO transport (default)

run-stdio: build ## Run the Docker container with STDIO transport
	@echo "Running $(FULL_IMAGE_NAME) with STDIO transport..."
	@echo "CONFIG_DIR=$(CONFIG_DIR)"
	docker run -i --rm \
		--name $(CONTAINER_NAME) \
		-e CONFIG_DIR=$(CONFIG_DIR) \
		-e TRANSPORT=stdio \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-e NODE_ENV=$(NODE_ENV) \
		$(FULL_IMAGE_NAME)

run-http: build ## Run the Docker container with HTTP transport
	@echo "Running $(FULL_IMAGE_NAME) with HTTP transport on port $(PORT)..."
	@echo "CONFIG_DIR=$(CONFIG_DIR)"
	docker run -i --rm \
		--name $(CONTAINER_NAME) \
		-p $(PORT):3000 \
		-e CONFIG_DIR=$(CONFIG_DIR) \
		-e TRANSPORT=http \
		-e PORT=3000 \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-e NODE_ENV=$(NODE_ENV) \
		$(FULL_IMAGE_NAME)

stop: ## Stop the running container
	@echo "Stopping container $(CONTAINER_NAME)..."
	-docker stop $(CONTAINER_NAME) 2>/dev/null || true
	@echo "Container stopped."

clean: stop ## Remove the Docker image
	@echo "Removing Docker image $(FULL_IMAGE_NAME)..."
	-docker rmi $(FULL_IMAGE_NAME) 2>/dev/null || true
	@echo "Image removed."
