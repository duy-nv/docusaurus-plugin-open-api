/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { PluginOptions } from './types';
import { Joi } from '@docusaurus/utils-validation';
import { OptionValidationContext, ValidationResult } from '@docusaurus/types';
export declare const DEFAULT_OPTIONS: Omit<PluginOptions, 'id'>;
export declare const OptionsSchema: Joi.ObjectSchema<any>;
export declare function validateOptions({ validate, options, }: OptionValidationContext<PluginOptions>): ValidationResult<PluginOptions>;
