// Copyright (c) 2025 AccelByte Inc. All Rights Reserved.
// This is licensed software from AccelByte Inc, for limitations
// and restrictions contact your company contract manager.

import { readFileSync } from 'node:fs';

import { z } from 'zod/v3';

import logger from '../logger.js';

const ResourceTypeSchema = z.enum(['inline', 'local', 'remote']);

type ResourceType = z.infer<typeof ResourceTypeSchema>;

const KnownMimeTypeSchema = z.enum([
  'application/json',
  'text/html',
  'text/markdown',
  'text/plain',
]);
const UnknownMimeTypeSchema = z.string().min(1, 'Mime type cannot be empty');
const MimeTypeSchema = KnownMimeTypeSchema.or(UnknownMimeTypeSchema);

const ResourceSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  uri: z.string().url().optional(),
  type: ResourceTypeSchema,
  description: z.string().min(1, 'Description cannot be empty'),
  mimeType: MimeTypeSchema,
  content: z.string().min(1, 'Content cannot be empty'),
});

type Resource = z.infer<typeof ResourceSchema> & {
  getUri(): string;
  getContents(
    uri: URL,
    context?: unknown
  ): Promise<{ uri: string; text: string }[]>;
};

const ResourceArraySchema = z.array(ResourceSchema);

type ResourceArray = z.infer<typeof ResourceArraySchema>;

function enrichResource(resource: z.infer<typeof ResourceSchema>): Resource {
  const getUri = (): string => {
    if (resource.uri) {
      return resource.uri.startsWith('resource://')
        ? resource.uri
        : `resource://${resource.uri}`;
    }
    const resourceUri = encodeURIComponent(
      resource.title.replace(/\s+/g, '-').toLowerCase()
    );
    return `resource://${resourceUri}`;
  };

  const getContents = async (
    uri: URL,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: unknown
  ): Promise<{ uri: string; text: string }[]> => {
    if (resource.type === 'inline') {
      return [{ uri: uri.href, text: resource.content }];
    }
    if (resource.type === 'local') {
      const text = readFileSync(resource.content, 'utf8');
      return [{ uri: uri.href, text }];
    }
    if (resource.type === 'remote') {
      const response = await fetch(resource.content);
      if (!response.ok) {
        logger.error(
          { url: resource.content, status: response.status },
          'Failed to fetch remote resource'
        );
        throw new Error('Failed to fetch resource. Please check server logs.');
      }
      const text = await response.text();
      return [{ uri: uri.href, text }];
    }
    throw new Error(`Invalid resource type ${resource.type}`);
  };

  return {
    ...resource,
    getUri,
    getContents,
  };
}

function enrichResources(
  resources: z.infer<typeof ResourceArraySchema>
): Resource[] {
  return resources
    .map((resource) => {
      try {
        return enrichResource(resource);
      } catch (error) {
        logger.warn(
          { resource: resource.title, error },
          'Failed to enrich resource, discarding'
        );
        return null;
      }
    })
    .filter((resource): resource is Resource => resource !== null);
}

function parseResources(data: unknown): Resource[] {
  const parsed = ResourceArraySchema.parse(data);
  return enrichResources(parsed);
}

export {
  ResourceType,
  ResourceTypeSchema,
  Resource,
  ResourceSchema,
  ResourceArray,
  ResourceArraySchema,
  enrichResource,
  enrichResources,
  parseResources,
};
