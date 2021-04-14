# encoding: utf-8
require 'yaml'

# Sets the minimum version for vagrant.
Vagrant.require_version '>= 1.8.6'

# Configure vagrant.
Vagrant.configure(2) do |config|

  # Load the custom configuration variables.
  _conf = YAML.load(
    File.open(
      File.join(File.dirname(__FILE__), 'provision/default.yml'),
      File::RDONLY
    ).read
  )

  #-----------------------------
  # SSH client settings.
  #-----------------------------
  config.putty.ssh_client = "c:/users/chuga/YandexDisk/soft/secure/putty/putty.exe"
  config.ssh.forward_agent = true
  config.ssh.insert_key = true
  #config.ssh.username = "vagrant"
  #config.ssh.password = "vagrant"
  #config.vm.provision :file, :source => "provision/unsecure.pub", :destination => "~/.ssh/authorized_keys"
  #config.vm.provision :shell, :name => "Setup authorized_keys", :inline => "mkdir  ~/.ssh && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && chown -R vagrant:vagrant ~/.ssh"

  # Forcing config variables
  _conf["vagrant_dir"] = "/vagrant"

  config.vm.define _conf['hostname'] do |v|
    if Vagrant.has_plugin?("vagrant-hostmanager")
      config.hostmanager.enabled = true
      config.hostmanager.manage_host = true
      config.hostmanager.manage_guest = true
      config.hostmanager.ignore_private_ip = false
      config.hostmanager.include_offline = false

      # Sets the hostname.
      config.vm.hostname = ENV['hostname'] || _conf['hostname']
    end
  end

  # Set configuration for base os image.
  config.vm.box = ENV['dist_box'] || _conf['dist_box']
  config.vm.box_check_update = ENV['dist_box_update'] || _conf['dist_box_update']

  # Check if base os image requires version.
  if _conf.has_key?('dist_box_version')
    config.vm.box_version = _conf['dist_box_version']
  end

  #if _conf.has_key?('mailcatcher') && _conf['mailcatcher']
  # @link: https://gist.github.com/snoek09/7edcfa71b5957163a1a4
  #  ServerName myapp.dev

    # proxy pass mailcatcher to internal webserver
  #  ProxyRequests Off
  #  ProxyPass /mailcatcher http://localhost:1080
  #  ProxyPass /assets http://localhost:1080/assets
  #  ProxyPass /messages ws://localhost:1080/messages
  #  config.vm.provision :shell, inline: "mailcatcher", run: "always"
  #  config.vm.provision "shell", inline: '/usr/bin/env mailcatcher --ip=0.0.0.0'
  #end

  # The url from where the 'config.vm.box' box will be fetched if it
  # doesn't already exist on the user's system.
  if _conf.has_key?('box_url')
      config.vm.box_url = _conf['box_url']
  end

  # Setup the boot timeout.
  if _conf.has_key?('boot_timeout')
    config.vm.boot_timeout = _conf['boot_timeout']
  end

  #-----------------------------
  # HD Settings
  #-----------------------------
  # if we have the disksize plugin, request a specific disk size
  if _conf.has_key?('disksize')
    if Vagrant.has_plugin?('vagrant-disksize')
      config.disksize.size = _conf['disksize']
    end
  end

  #-----------------------------
  # Network Settings
  #-----------------------------

  # Setup a private network and set this guest's IP
  if _conf.has_key?('ip')
    if _conf.has_key?('netmask')
      config.vm.network :private_network, ip: _conf['ip'], netmask: _conf['netmask']
    else
      config.vm.network :private_network, ip: _conf['ip']
    end
  else
    config.vm.network :private_network, type: "dhcp"
  end

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:[port]" will access port 8080 on the VM.
  #config.vm.network :forwarded_port, guest: 8080, host: CONF['port'],
  #  auto_correct: true

  # Forward database port to local machine port.
  #config.vm.network :forwarded_port, guest: _conf['db_guest_port'], host: _conf['db_host_port'],
  #  auto_correct: true

  # If a port collision occurs (e.g. port 8080 on local machine is in use),
  # then tell Vagrant to use the next available port between 8081 and 8100
  #config.vm.usable_port_range = 8081..8100

  # Create a '/etc/sudoers.d/root_ssh_agent' file which ensures sudo keeps any SSH_AUTH_SOCK settings
  # This allows sudo commands (like "sudo ssh git@github.com") to have access to local SSH keys (via SSH Forwarding)
  # See: https://github.com/mitchellh/vagrant/issues/1303
  config.vm.provision :shell do |shell|
    shell.inline = "touch $1 && chmod 0440 $1 && echo $2 > $1"
    shell.args = %q{/etc/sudoers.d/root_ssh_agent "Defaults    env_keep += \"SSH_AUTH_SOCK\""}
    shell.name = "creating /etc/sudores.d/root_ssh_agent"
  end

  # Sync folders configure.
  if _conf.has_key?('synced_folder') && _conf.has_key?('document_root')
    config.vm.synced_folder _conf['synced_folder'], _conf['document_root'], :create => "true", :mount_options => ['dmode=755', 'fmode=644'],
    SharedFoldersEnableSymlinksCreate: true
  end

  # Sets aliases for the hostname.
  if _conf.has_key?('hostname_aliases') && Vagrant.has_plugin?('vagrant-hostsupdater')
    config.hostsupdater.aliases = _conf['hostname_aliases']
    config.hostsupdater.remove_on_suspend = false
  end

  # Disable auto updates for vbguest.
  if Vagrant.has_plugin?('vagrant-vbguest')
    config.vbguest.auto_update = false
  end

  # Check if provision-pre.sh file and execute file if is exists.
  if File.exists?(File.join(File.dirname(__FILE__), 'provision/previous.sh')) then
    config.vm.provision :shell, :path => File.join( File.dirname(__FILE__), 'provision/previous.sh' )
  end

  # Sets the settings for the box.
  config.vm.provider :virtualbox do |vb|
    if _conf.has_key?('linked_clone')
      vb.linked_clone = _conf['linked_clone']
    end

    # Setup the box name.
    if _conf.has_key?('name')
      vb.name = _conf['name']
    end

    # Defines the cpus and ram for box.
    cpu = _conf.has_key?('cpus') ? _conf['cpus'].to_i : 1
    memory = _conf.has_key?('memory') ? _conf['memory'].to_i : 512

    # Setup cpus and ram.
    vb.memory = memory
    vb.cpus = cpu

    # If cpus > 1: enable io apic.
    if 1 < _conf['cpus'].to_i
      vb.customize ['modifyvm', :id, '--ioapic', 'on']
    end

    # Set limit execution cap for cpus.
    if _conf.has_key?('cpu_execution_cap')
      vb.customize ["modifyvm", :id, "--cpuexecutioncap", _conf['cpu_execution_cap'].to_i]
    end

    vb.customize ['modifyvm', :id, '--natdnsproxy1', 'on']
    vb.customize ['modifyvm', :id, '--natdnshostresolver1', 'on']
    vb.customize ['setextradata', :id, 'VBoxInternal/Devices/VMMDev/0/Config/GetHostTimeDisabled', 0]
  end

  # Check if can ansible.
  config.vm.provision "ansible_local" do |ansible|
    ansible.compatibility_mode = "2.0"
    ansible.verbose = "v"
    ansible.limit = "all"
    #ansible.groups = groups

    #ansible_inventory_path = "inventory/hosts"
    ansible_user = "vagrant"

    # Sets the extra vars.
    ansible.extra_vars = {
      box: _conf
    }

    # Execute the playbook.
    ansible.playbook = "provision/vagrant.yml"
  end

  # Check if after.sh file and execute file if is exists.
  if File.exists?(File.join(File.dirname(__FILE__), 'provision/after.sh')) then
    config.vm.provision :shell, :path => File.join( File.dirname(__FILE__), 'provision/after.sh' )
  end

  # Check if always.sh file and execute file if is exists.
  if File.exists?(File.join(File.dirname(__FILE__), 'provision/always.sh')) then
    config.vm.provision :shell, :path => File.join( File.dirname(__FILE__), 'provision/always.sh' ), run: 'always'
  end
end
