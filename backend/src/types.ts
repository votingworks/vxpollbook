import { DateWithoutTime } from '@votingworks/basics';
import * as grout from '@votingworks/grout';
import z from 'zod';
import {
  ElectionIdSchema,
  PrinterStatus,
  Election as VxSuiteElection,
} from '@votingworks/types';
import { BatteryInfo } from '@votingworks/backend';
import { UsbDrive, UsbDriveStatus } from '@votingworks/usb-drive';
import { DippedSmartCardAuthApi } from '@votingworks/auth';
import { Printer } from '@votingworks/printing';
import type { Api } from './app';
import { HlcTimestamp } from './hybrid_logical_clock';
import type { Store } from './store';

export interface AppContext {
  workspace: Workspace;
  auth: DippedSmartCardAuthApi;
  usbDrive: UsbDrive;
  printer: Printer;
  machineId: string;
}

export interface Workspace {
  assetDirectoryPath: string;
  store: Store;
}

export type Election = Pick<
  VxSuiteElection,
  'id' | 'title' | 'date' | 'precincts'
>;

export const ElectionSchema: z.ZodSchema<
  Election,
  z.ZodTypeDef,
  Omit<Election, 'date'> & { date: string }
> = z.object({
  id: ElectionIdSchema,
  title: z.string(),
  date: z
    .string()
    .date()
    .transform((date) => new DateWithoutTime(date)),
  precincts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .min(1),
});

export type VoterIdentificationMethod =
  | {
      type: 'photoId';
      state: string;
    }
  | {
      type: 'challengedVoterAffidavit';
    }
  | {
      type: 'personalRecognizance';
      recognizer: 'supervisor' | 'moderator' | 'cityClerk';
    };

export interface VoterCheckIn {
  identificationMethod: VoterIdentificationMethod;
  timestamp: string;
  machineId: string;
}

export const VoterCheckInSchema: z.ZodSchema<VoterCheckIn> = z.object({
  identificationMethod: z.union([
    z.object({
      type: z.literal('photoId'),
      state: z.string(),
    }),
    z.object({
      type: z.literal('challengedVoterAffidavit'),
    }),
    z.object({
      type: z.literal('personalRecognizance'),
      recognizer: z.union([
        z.literal('supervisor'),
        z.literal('moderator'),
        z.literal('cityClerk'),
      ]),
    }),
  ]),
  timestamp: z.string(),
  machineId: z.string(),
});

export interface Voter {
  voterId: string;
  lastName: string;
  suffix: string;
  firstName: string;
  middleName: string;
  streetNumber: string;
  addressSuffix: string;
  houseFractionNumber: string;
  streetName: string;
  apartmentUnitNumber: string;
  addressLine2: string;
  addressLine3: string;
  postalCityTown: string;
  state: string;
  postalZip5: string;
  zip4: string;
  mailingStreetNumber: string;
  mailingSuffix: string;
  mailingHouseFractionNumber: string;
  mailingStreetName: string;
  mailingApartmentUnitNumber: string;
  mailingAddressLine2: string;
  mailingAddressLine3: string;
  mailingCityTown: string;
  mailingState: string;
  mailingZip5: string;
  mailingZip4: string;
  party: string;
  district: string;
  checkIn?: VoterCheckIn;
}

export const VoterSchema: z.ZodSchema<Voter> = z.object({
  voterId: z.string(),
  lastName: z.string(),
  suffix: z.string(),
  firstName: z.string(),
  middleName: z.string(),
  streetNumber: z.string(),
  addressSuffix: z.string(),
  houseFractionNumber: z.string(),
  streetName: z.string(),
  apartmentUnitNumber: z.string(),
  addressLine2: z.string(),
  addressLine3: z.string(),
  postalCityTown: z.string(),
  state: z.string(),
  postalZip5: z.string(),
  zip4: z.string(),
  mailingStreetNumber: z.string(),
  mailingSuffix: z.string(),
  mailingHouseFractionNumber: z.string(),
  mailingStreetName: z.string(),
  mailingApartmentUnitNumber: z.string(),
  mailingAddressLine2: z.string(),
  mailingAddressLine3: z.string(),
  mailingCityTown: z.string(),
  mailingState: z.string(),
  mailingZip5: z.string(),
  mailingZip4: z.string(),
  party: z.string(),
  district: z.string(),
  checkIn: VoterCheckInSchema.optional(),
});

export interface MachineInformation {
  machineId: string;
  configuredElectionId?: string;
}

export type VectorClock = Record<string, number>;

export const VectorClockSchema: z.ZodSchema<VectorClock> = z.record(z.number());

export interface PollbookEvent {
  type: EventType;
  machineId: string;
  localEventId: number;
  timestamp: HlcTimestamp;
}

export interface VoterCheckInEvent extends PollbookEvent {
  type: EventType.VoterCheckIn;
  voterId: string;
  checkInData: VoterCheckIn;
}

export interface UndoVoterCheckInEvent extends PollbookEvent {
  type: EventType.UndoVoterCheckIn;
  voterId: string;
}

export interface VoterSearchParams {
  lastName: string;
  firstName: string;
}

export interface PollbookPackage {
  election: Election;
  voters: Voter[];
}

export interface PollbookService {
  apiClient?: grout.Client<Api>;
  machineId: string;
  lastSeen: Date;
  status: PollbookConnectionStatus;
}

export interface ConnectedPollbookService extends PollbookService {
  status: PollbookConnectionStatus.Connected;
  apiClient: grout.Client<Api>;
}

export interface PollbookServiceInfo
  extends Omit<PollbookService, 'apiClient'> {
  numCheckIns: number;
}

export interface NetworkStatus {
  pollbooks: PollbookServiceInfo[];
  isOnline: boolean;
}

export interface DeviceStatuses {
  battery?: BatteryInfo;
  printer: PrinterStatus;
  usbDrive: UsbDriveStatus;
  network: {
    isOnline: boolean;
    pollbooks: PollbookServiceInfo[];
  };
}

export enum EventType {
  VoterCheckIn = 'VoterCheckIn',
  UndoVoterCheckIn = 'UndoVoterCheckIn',
}

export enum PollbookConnectionStatus {
  Connected = 'Connected',
  ShutDown = 'ShutDown',
  LostConnection = 'LostConnection',
  WrongElection = 'WrongElection',
}

export interface EventDbRow {
  event_id: number;
  machine_id: string;
  voter_id: string;
  event_type: EventType;
  event_data: string;
  physical_time: number;
  logical_counter: number;
}

export type ConfigurationStatus = 'loading' | 'not-found';
