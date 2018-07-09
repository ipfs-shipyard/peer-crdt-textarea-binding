var async = require('async')
var RTT = require('realtime-text')


module.exports = class TextareaBinding {
    constructor(crdt, textarea) {
        this.crdt = crdt;
        this.textarea = textarea;
        this.localChanges = new Set();

        this.halted = false;
        this.needDiff = false;

        this.queue = async.queue((change, done) => {
            const haltState = this.halted;
            if (this.localChanges.has(change.id)) {
                this.localChanges.delete(change.id);
            } else {
                this.halted = true;

                let cursor = this.textarea.selectionStart;
                if (change.type === 'insert' && change.pos <= cursor) {
                    cursor += change.atom.length;
                }
                if (change.type === 'delete' && change.pos <= cursor) {
                    cursor -= Math.min(change.length, cursor - change.pos);
                }

                const value = this.crdt.value();
                this.textarea.value = value;
                this.textarea.setSelectionRange(cursor, cursor);

                this.halted = haltState;
            }

            done();
        });

        this.textarea.addEventListener('input', () => {
            this.runDiff();
        });

        this.crdt.on('change', (change) => {
            this.add(change);
        });
    }

    async runDiff() {
        if (this.halted) {
            this.needDiff = true;
            return;
        }
        this.needDiff = false;

        const diff = RTT.diff(Buffer.from(this.crdt.value()), Buffer.from(this.textarea.value, 'utf8'))
        if (diff.length === 0) {
          return;
        }

        this.halted = true;
        this.queue.pause();

        for (const edit of diff) {
          switch (edit.type) {
            case 'insert':
              const insertRes = await this.crdt.insertAt(edit.pos, edit.text)
              this.localChanges.add(insertRes[0]);
              break
            case 'erase':
              const deleteRes = await this.crdt.removeAt(edit.pos - edit.num, edit.num)
              this.localChanges.add(deleteRes[0]);
              break
          }
        }

        this.resume();
    }

    add(change) {
        this.queue.push(change);
    }

    halt() {
        this.halted = true;
        this.queue.pause();
    }

    resume() {
        this.halted = false;
        this.queue.resume();
        if (this.needDiff) {
            this.runDiff();
        }
    }
}
