import Service from './service';

export default class ServiceMap {
    remotes = new Map<number, Service>();
    count = 0;

    end() {
        for (const remote of this.remotes.values()) {
            remote.end();
        }
        this.remotes.clear();
        this.count = 0;
    }

    insert(remoteId: number, socket: Service) {
        if (this.remotes.has(remoteId)) {
            throw new Error(`Remote ID ${remoteId} is already being used`);
        } else {
            this.count += 1;
            this.remotes.set(remoteId, socket);
            return socket;
        }
    }

    get(remoteId: number) {
        return this.remotes.get(remoteId) || null;
    }

    remove(remoteId: number) {
        let remote = this.remotes.get(remoteId);
        if (remote) {
            this.remotes.delete(remoteId);
            this.count -= 1;
            return remote;
        } else {
            return null;
        }
    }
}
